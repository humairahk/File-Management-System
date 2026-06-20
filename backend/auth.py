from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import re
from models import db, User, AuditLog

auth_bp = Blueprint('auth', __name__)

def log_audit(user_id, user_name, role, action, result, details=None, ip_address=None, device_client=None):
    """Helper function to log audit events"""
    try:
        audit_log = AuditLog(
            user_id=user_id,
            user_name=user_name,
            role=role,
            action=action,
            result=result,
            details=details,
            ip_address=ip_address,
            device_client=device_client,
            timestamp=datetime.utcnow()
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f'Error logging audit: {str(e)}')

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        role = data.get('role', 'reader')
        
        # Validation
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required'}), 400
        
        # Get user
        user = User.query.filter_by(email=email).first()
        
        if not user:
            log_audit(
                user_id=None,
                user_name='Unknown',
                role='Unknown',
                action='Login Attempt',
                result='Failed',
                details=f'Invalid email: {email}',
                ip_address=request.remote_addr,
                device_client=request.user_agent.string
            )
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        # Check password
        if not user.check_password(password):
            log_audit(
                user_id=user.id,
                user_name=user.name,
                role=user.role,
                action='Login Attempt',
                result='Failed',
                details='Incorrect password',
                ip_address=request.remote_addr,
                device_client=request.user_agent.string
            )
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        # Check role
        if user.role != role:
            log_audit(
                user_id=user.id,
                user_name=user.name,
                role=user.role,
                action='Login Attempt',
                result='Failed',
                details=f'Role mismatch. Expected: {role}, Actual: {user.role}',
                ip_address=request.remote_addr,
                device_client=request.user_agent.string
            )
            return jsonify({'success': False, 'message': 'Access denied for this role'}), 403
        
        # Check if user is active
        if not user.is_active:
            log_audit(
                user_id=user.id,
                user_name=user.name,
                role=user.role,
                action='Login Attempt',
                result='Failed',
                details='Account is deactivated',
                ip_address=request.remote_addr,
                device_client=request.user_agent.string
            )
            return jsonify({'success': False, 'message': 'Account is deactivated'}), 403
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create JWT token
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role
            }
        )
        
        # Log successful login
        log_audit(
            user_id=user.id,
            user_name=user.name,
            role=user.role,
            action='Login',
            result='Success',
            ip_address=request.remote_addr,
            device_client=request.user_agent.string
        )
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role
            },
            'token': access_token
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Login error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        user_data = get_jwt_identity()
        
        log_audit(
            user_id=user_data['id'],
            user_name=user_data['name'],
            role=user_data['role'],
            action='Logout',
            result='Success',
            ip_address=request.remote_addr,
            device_client=request.user_agent.string
        )
        
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Logout error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Don't reveal if user exists for security
            return jsonify({'success': True, 'message': 'If the email exists, reset instructions will be sent'}), 200
        
        # Generate reset token
        reset_token = user.generate_reset_token()
        db.session.commit()
        
        # In production, send email here
        print(f"Reset token for {email}: {reset_token}")
        
        log_audit(
            user_id=user.id,
            user_name=user.name,
            role=user.role,
            action='Password Reset Request',
            result='Success',
            details='Reset token generated',
            ip_address=request.remote_addr,
            device_client=request.user_agent.string
        )
        
        return jsonify({
            'success': True,
            'message': 'Reset instructions sent',
            'token': reset_token  # For demo only - remove in production
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Forgot password error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        token = data.get('token', '')
        new_password = data.get('new_password', '')
        
        if not email or not token or not new_password:
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        # Validate password strength
        if len(new_password) < 8:
            return jsonify({'success': False, 'message': 'Password must be at least 8 characters'}), 400
        
        if not re.search(r'[A-Z]', new_password):
            return jsonify({'success': False, 'message': 'Password must contain at least one uppercase letter'}), 400
        
        if not re.search(r'[a-z]', new_password):
            return jsonify({'success': False, 'message': 'Password must contain at least one lowercase letter'}), 400
        
        if not re.search(r'\d', new_password):
            return jsonify({'success': False, 'message': 'Password must contain at least one number'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'success': False, 'message': 'Invalid request'}), 400
        
        # Check token
        if not user.reset_token or user.reset_token != token:
            return jsonify({'success': False, 'message': 'Invalid or expired token'}), 400
        
        if datetime.utcnow() > user.reset_token_expiry:
            return jsonify({'success': False, 'message': 'Token has expired'}), 400
        
        # Update password
        user.set_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        db.session.commit()
        
        log_audit(
            user_id=user.id,
            user_name=user.name,
            role=user.role,
            action='Password Reset',
            result='Success',
            ip_address=request.remote_addr,
            device_client=request.user_agent.string
        )
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Reset password error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_data = get_jwt_identity()
        user = User.query.get(user_data['id'])
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Get profile error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@auth_bp.route('/check-session', methods=['GET'])
@jwt_required()
def check_session():
    try:
        user_data = get_jwt_identity()
        
        return jsonify({
            'authenticated': True,
            'user': user_data
        }), 200
        
    except Exception as e:
        return jsonify({'authenticated': False}), 401