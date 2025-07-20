from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.log import Log

log_bp = Blueprint('log', __name__)

@log_bp.route('/logs', methods=['GET'])
@jwt_required()
def get_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    query = Log.query.order_by(Log.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({'code': 0, 'msg': 'success', 'data': [
        {'id': l.id, 'operator': l.operator, 'action': l.action, 'target': l.target, 'detail': l.detail, 'ip': l.ip, 'user_agent': l.user_agent, 'created_at': l.created_at} for l in pagination.items
    ], 'total': pagination.total, 'pages': pagination.pages, 'current_page': page}) 