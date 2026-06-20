from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
import string

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='reader')  # 'admin' or 'reader'
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    reset_token = db.Column(db.String(100))
    reset_token_expiry = db.Column(db.DateTime)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def generate_reset_token(self, length=32):
        self.reset_token = secrets.token_urlsafe(length)
        self.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        return self.reset_token
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class File(db.Model):
    __tablename__ = 'files'
    
    id = db.Column(db.Integer, primary_key=True)
    file_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    file_name = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=False)  # Letters, Certificates, etc.
    description = db.Column(db.Text)
    upload_date = db.Column(db.Date, nullable=False)
    file_size = db.Column(db.Float, nullable=False)  # in MB
    file_path = db.Column(db.String(500), nullable=False)
    uploaded_by = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='Active')  # Active, Archived, Deleted
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_number': self.file_number,
            'file_name': self.file_name,
            'original_name': self.original_name,
            'category': self.category,
            'description': self.description,
            'upload_date': self.upload_date.isoformat() if self.upload_date else None,
            'file_size': round(self.file_size, 2),
            'uploaded_by': self.uploaded_by,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    user_id = db.Column(db.Integer, index=True)
    user_name = db.Column(db.String(255))
    role = db.Column(db.String(50))
    action = db.Column(db.String(100))
    file_name = db.Column(db.String(255))
    file_id = db.Column(db.String(50))
    ip_address = db.Column(db.String(50))
    device_client = db.Column(db.String(255))
    result = db.Column(db.String(50))
    details = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'user_id': self.user_id,
            'user_name': self.user_name,
            'role': self.role,
            'action': self.action,
            'file_name': self.file_name,
            'file_id': self.file_id,
            'ip_address': self.ip_address,
            'device_client': self.device_client,
            'result': self.result,
            'details': self.details
        }

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    prefix = db.Column(db.String(10), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'prefix': self.prefix,
            'description': self.description
        }

def create_default_categories():
    """Create default categories if they don't exist"""
    categories = [
        {'name': 'Letters', 'prefix': 'LR', 'description': 'Official letters and correspondence'},
        {'name': 'Certificates', 'prefix': 'CR', 'description': 'Certificates and accreditations'},
        {'name': 'Test Reports', 'prefix': 'TR', 'description': 'Laboratory and test reports'},
        {'name': 'Component Reports', 'prefix': 'STR', 'description': 'Component and structural reports'}
    ]
    
    for cat_data in categories:
        if not Category.query.filter_by(name=cat_data['name']).first():
            category = Category(**cat_data)
            db.session.add(category)
    
    try:
        db.session.commit()
    except:
        db.session.rollback()