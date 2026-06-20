import os
from datetime import timedelta

class Config:
    # Database Configuration (SQLite for simplicity)
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(BASE_DIR, "..", "database", "file_management.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Configuration
    SECRET_KEY = 'your-secret-key-change-in-production-2024'
    JWT_SECRET_KEY = 'your-jwt-secret-key-change-in-production-2024'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_COOKIE_SECURE = False  # Set to True in production with HTTPS
    JWT_COOKIE_CSRF_PROTECT = False
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(BASE_DIR), 'uploads')
    ALLOWED_EXTENSIONS = {'pdf'}
    
    # Application Configuration
    DEBUG = True
    HOST = '0.0.0.0'
    PORT = 5000