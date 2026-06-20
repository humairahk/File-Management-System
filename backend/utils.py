import os
import re
from datetime import datetime
from flask import current_app
from models import db, AuditLog, File

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def generate_file_number(category):
    """Generate next sequential file number based on category"""
    prefix_map = {
        'Letters': 'LR',
        'Certificates': 'CR',
        'Test Reports': 'TR',
        'Component Reports': 'STR'
    }
    
    prefix = prefix_map.get(category, 'XX')
    
    # Get last file number for this category
    last_file = File.query.filter_by(category=category).order_by(File.id.desc()).first()
    
    if last_file:
        # Extract number from file number
        try:
            last_num = int(last_file.file_number.replace(prefix, ''))
            next_num = last_num + 1
        except ValueError:
            # If format doesn't match, start from 1
            next_num = 1
    else:
        next_num = 1
    
    return f"{prefix}{next_num:04d}"

def log_audit(user_id=None, user_name=None, role=None, action=None, 
              file_name=None, file_id=None, ip_address=None, 
              device_client=None, result=None, details=None):
    """Log user action to audit trail"""
    try:
        audit_log = AuditLog(
            user_id=user_id,
            user_name=user_name,
            role=role,
            action=action,
            file_name=file_name,
            file_id=file_id,
            ip_address=ip_address,
            device_client=device_client,
            result=result,
            details=details,
            timestamp=datetime.utcnow()
        )
        
        db.session.add(audit_log)
        db.session.commit()
        
    except Exception as e:
        current_app.logger.error(f'Failed to log audit: {str(e)}')

def create_upload_folders():
    """Create upload folders for each category"""
    categories = ['Letters', 'Certificates', 'Test Reports', 'Component Reports']
    
    for category in categories:
        folder_name = category.lower().replace(' ', '_')
        folder_path = os.path.join(current_app.config['UPLOAD_FOLDER'], folder_name)
        
        try:
            os.makedirs(folder_path, exist_ok=True)
            current_app.logger.info(f'Created upload folder: {folder_path}')
        except Exception as e:
            current_app.logger.error(f'Failed to create folder {folder_path}: {str(e)}')