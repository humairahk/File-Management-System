import os
from flask import Flask, jsonify, send_from_directory, request, session
from flask_cors import CORS
from flask_session import Session
from datetime import timedelta
import uuid

app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Simple configuration
app.secret_key = 'dev-secret-key-change-in-production'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)
app.config['SESSION_COOKIE_SECURE'] = False      # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_FOLDER'] = os.path.join(os.path.dirname(__file__), '..', 'instance', 'sessions')

# File upload configuration
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), '..', 'uploads')
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize Flask-Session
Session(app)
CORS(app, supports_credentials=True)

# Hardcoded users (for demo)
USERS = {
    'admin@company.com': {
        'id': 1,
        'name': 'System Administrator',
        'password': 'Admin@123',
        'role': 'admin'
    },
    'reader@company.com': {
        'id': 2,
        'name': 'John Reader',
        'password': 'Reader@123',
        'role': 'reader'
    }
}

# ---------- AUTH ROUTES ----------
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'reader')

    print(f"Login attempt: {email}")

    if email in USERS and USERS[email]['password'] == password:
        user = USERS[email]
        # Verify role matches (optional)
        if user['role'] != role:
            return jsonify({'success': False, 'message': 'Role mismatch'}), 403

        # Store user in session
        session['user'] = {
            'id': user['id'],
            'email': email,
            'name': user['name'],
            'role': user['role']
        }
        session.permanent = True
        print(f"Login successful for {email}")
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': session['user']
        })
    else:
        print(f"Login failed for {email}")
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/auth/check-session', methods=['GET'])
def check_session():
    if 'user' in session:
        return jsonify({
            'authenticated': True,
            'user': session['user']
        })
    return jsonify({'authenticated': False}), 401

@app.route('/api/auth/profile', methods=['GET'])
def profile():
    if 'user' in session:
        return jsonify({'success': True, 'user': session['user']})
    return jsonify({'success': False}), 401

# ---------- FILE ROUTES (mock) ----------
@app.route('/api/stats', methods=['GET'])
def stats():
    if 'user' not in session:
        return jsonify({'success': False}), 401
    # Return mock stats
    return jsonify({
        'success': True,
        'stats': {
            'total_files': 0,
            'today_uploads': 0,
            'total_storage_mb': 0,
            'category_stats': {},
            'next_numbers': {
                'Letters': 'LR0001',
                'Certificates': 'CR0001',
                'Test Reports': 'TR0001',
                'Component Reports': 'STR0001'
            }
        }
    })

@app.route('/api/categories', methods=['GET'])
def categories():
    if 'user' not in session:
        return jsonify({'success': False}), 401
    return jsonify({
        'success': True,
        'categories': [
            {'id': 1, 'name': 'Letters', 'prefix': 'LR', 'file_count': 0},
            {'id': 2, 'name': 'Certificates', 'prefix': 'CR', 'file_count': 0},
            {'id': 3, 'name': 'Test Reports', 'prefix': 'TR', 'file_count': 0},
            {'id': 4, 'name': 'Component Reports', 'prefix': 'STR', 'file_count': 0}
        ]
    })

# ---------- SERVE FRONTEND ----------
@app.route('/')
@app.route('/<path:path>')
def serve_frontend(path='index.html'):
    try:
        return send_from_directory(app.static_folder, path)
    except:
        return send_from_directory(app.static_folder, 'index.html')

# Register file upload routes
try:
    from uploads import uploads_bp
    app.register_blueprint(uploads_bp, url_prefix='/api')
except ImportError as e:
    print(f"Warning: Could not import uploads blueprint: {e}")

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 FILEORGANISER - STARTING...")
    print("="*50)
    print("\n📊 Server: http://localhost:5000")
    print("👨‍💼 Admin: admin@company.com / Admin@123")
    print("👁️ Reader: reader@company.com / Reader@123")
    print("="*50 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
    