from flask import Blueprint, request, jsonify, current_app, send_file, session
from werkzeug.utils import secure_filename
from datetime import datetime
import os

uploads_bp = Blueprint('uploads', __name__)

@uploads_bp.route('/upload', methods=['POST'])
def upload_file():
    try:
        # Check if user is authenticated
        if 'user' not in session:
            return jsonify({'success': False, 'message': 'Not authenticated'}), 401
        
        user_data = session['user']
        
        # Check if user is admin
        if user_data['role'] != 'admin':
            return jsonify({'success': False, 'message': 'Only administrators can upload files'}), 403
        
        # Get form data
        category = request.form.get('category', '').strip()
        description = request.form.get('description', '').strip()
        
        if not category:
            return jsonify({'success': False, 'message': 'Category is required'}), 400
        
        # Validate category
        valid_categories = ['Letters', 'Certificates', 'Test Reports', 'Component Reports']
        if category not in valid_categories:
            return jsonify({'success': False, 'message': 'Invalid category'}), 400
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        # Check file extension
        allowed_extensions = {'pdf'}
        if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'success': False, 'message': 'Only PDF files are allowed'}), 400
        
        # Secure filename
        original_filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_filename = f"{timestamp}_{original_filename}"
        
        # Create category directory if it doesn't exist
        upload_folder = current_app.config['UPLOAD_FOLDER']
        category_dir = os.path.join(upload_folder, category.lower().replace(' ', '_'))
        os.makedirs(category_dir, exist_ok=True)
        
        # Generate file number
        prefix_map = {
            'Letters': 'LR',
            'Certificates': 'CR',
            'Test Reports': 'TR',
            'Component Reports': 'STR'
        }
        prefix = prefix_map.get(category, 'XX')
        
        # For now, use a simple increment - in production would query database
        import glob
        existing_files = glob.glob(os.path.join(category_dir, '*'))
        file_number = f"{prefix}{len(existing_files) + 1:04d}"
        
        # Save file
        file_path = os.path.join(category_dir, safe_filename)
        file.save(file_path)
        
        # Get file size in MB
        file_size = os.path.getsize(file_path) / (1024 * 1024)
        
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'file': {
                'file_number': file_number,
                'file_name': safe_filename,
                'original_name': original_filename,
                'category': category,
                'description': description,
                'file_size': round(file_size, 2),
                'upload_date': datetime.now().isoformat()
            }
        }), 201
        
    except Exception as e:
        current_app.logger.error(f'Upload error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@uploads_bp.route('/files', methods=['GET'])
def get_files():
    try:
        # Check if user is authenticated
        if 'user' not in session:
            return jsonify({'success': False, 'message': 'Not authenticated'}), 401
        
        # For now, return empty list - would query database in production
        return jsonify({
            'success': True,
            'files': [],
            'pagination': {
                'page': 1,
                'per_page': 20,
                'total': 0,
                'pages': 0
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Get files error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@uploads_bp.route('/categories', methods=['GET'])
def get_categories():
    try:
        # Check if user is authenticated
        if 'user' not in session:
            return jsonify({'success': False, 'message': 'Not authenticated'}), 401
        
        categories = [
            {'id': 1, 'name': 'Letters', 'prefix': 'LR', 'file_count': 0},
            {'id': 2, 'name': 'Certificates', 'prefix': 'CR', 'file_count': 0},
            {'id': 3, 'name': 'Test Reports', 'prefix': 'TR', 'file_count': 0},
            {'id': 4, 'name': 'Component Reports', 'prefix': 'STR', 'file_count': 0}
        ]
        
        return jsonify({
            'success': True,
            'categories': categories
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Get categories error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@uploads_bp.route('/stats', methods=['GET'])
def get_stats():
    try:
        # Check if user is authenticated
        if 'user' not in session:
            return jsonify({'success': False, 'message': 'Not authenticated'}), 401
        
        # Return mock stats
        return jsonify({
            'success': True,
            'stats': {
                'total_files': 0,
                'today_uploads': 0,
                'total_storage_mb': 0,
                'category_stats': {
                    'Letters': 0,
                    'Certificates': 0,
                    'Test Reports': 0,
                    'Component Reports': 0
                },
                'next_numbers': {
                    'Letters': 'LR0001',
                    'Certificates': 'CR0001',
                    'Test Reports': 'TR0001',
                    'Component Reports': 'STR0001'
                }
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Get stats error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500