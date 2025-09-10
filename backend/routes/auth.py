from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from config import Config
import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    password = data.get('password')
    remember = data.get('remember', False)
    
    # 创建Config实例
    config = Config()
    
    if password != config.ADMIN_PASSWORD:
        return jsonify({'code': 1, 'msg': '密码错误'}), 401
    
    expires = datetime.timedelta(seconds=config.JWT_REMEMBER_TOKEN_EXPIRES if remember else config.JWT_ACCESS_TOKEN_EXPIRES)
    token = create_access_token(identity=config.ADMIN_USERNAME, expires_delta=expires)
    return jsonify({'code': 0, 'msg': 'success', 'token': token})

@auth_bp.route('/verify', methods=['GET', 'OPTIONS'])
def verify_token():
    """验证token有效性"""
    if request.method == 'OPTIONS':
        # 处理预检请求
        return '', 200
    
    # 只有GET请求才需要JWT认证
    from functools import wraps
    from flask_jwt_extended import verify_jwt_in_request
    
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        return jsonify({
            'code': 0,
            'msg': 'Token有效',
            'data': {
                'identity': identity,
                'valid': True
            }
        })
    except Exception as e:
        return jsonify({
            'code': 1,
            'msg': 'Token无效',
            'data': {
                'valid': False
            }
        }), 401
