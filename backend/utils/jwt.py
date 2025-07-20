from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from functools import wraps
from flask import jsonify

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        identity = get_jwt_identity()
        # 可扩展更多权限校验
        if identity != 'admin':
            return jsonify({'code': 1, 'msg': '无权限'}), 403
        return fn(*args, **kwargs)
    return wrapper 