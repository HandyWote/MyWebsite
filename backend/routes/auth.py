from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from setup import Config
import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    password = data.get('password')
    remember = data.get('remember', False)
    if password != Config.ADMIN_PASSWORD:
        return jsonify({'code': 1, 'msg': '密码错误'}), 401
    expires = datetime.timedelta(seconds=Config.JWT_REMEMBER_TOKEN_EXPIRES if remember else Config.JWT_ACCESS_TOKEN_EXPIRES)
    token = create_access_token(identity=Config.ADMIN_USERNAME, expires_delta=expires)
    return jsonify({'code': 0, 'msg': 'success', 'token': token}) 