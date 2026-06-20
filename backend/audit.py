from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from models import db, AuditLog
from utils import log_audit

audit_bp = Blueprint('audit', __name__)

@audit_bp.route('/logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    try:
        user_data = get_jwt_identity()
        
        # Only admins can view audit logs
        if user_data['role'] != 'admin':
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 25))
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        action = request.args.get('action', '')
        search = request.args.get('search', '')
        
        # Build query
        query = AuditLog.query
        
        # Apply filters
        if start_date:
            try:
                start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(AuditLog.timestamp >= start)
            except ValueError:
                pass
        
        if end_date:
            try:
                end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                end = end + timedelta(days=1)
                query = query.filter(AuditLog.timestamp <= end)
            except ValueError:
                pass
        
        if action:
            query = query.filter_by(action=action)
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                db.or_(
                    AuditLog.user_name.ilike(search_term),
                    AuditLog.file_name.ilike(search_term),
                    AuditLog.action.ilike(search_term),
                    AuditLog.details.ilike(search_term)
                )
            )
        
        # Order by timestamp (newest first)
        query = query.order_by(AuditLog.timestamp.desc())
        
        # Pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        logs = [log.to_dict() for log in pagination.items]
        
        return jsonify({
            'success': True,
            'logs': logs,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Get audit logs error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@audit_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_audit_stats():
    try:
        user_data = get_jwt_identity()
        
        if user_data['role'] != 'admin':
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        # Total logs
        total_logs = AuditLog.query.count()
        
        # Logs in last 30 days
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        logs_last_30_days = AuditLog.query.filter(
            AuditLog.timestamp >= start_date,
            AuditLog.timestamp <= end_date
        ).count()
        
        # Actions by type
        actions_by_type = {}
        actions = db.session.query(
            AuditLog.action,
            db.func.count(AuditLog.id).label('count')
        ).group_by(AuditLog.action).all()
        
        for action, count in actions:
            actions_by_type[action] = count
        
        # Results distribution
        results_by_type = {}
        results = db.session.query(
            AuditLog.result,
            db.func.count(AuditLog.id).label('count')
        ).group_by(AuditLog.result).all()
        
        for result, count in results:
            results_by_type[result] = count
        
        return jsonify({
            'success': True,
            'stats': {
                'total_logs': total_logs,
                'logs_last_30_days': logs_last_30_days,
                'actions_by_type': actions_by_type,
                'results_distribution': results_by_type
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Get audit stats error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500