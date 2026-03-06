import pytest
import json
from unittest.mock import patch, MagicMock


class TestAuthRoutes:
    """测试认证路由"""

    def test_login_success(self, app):
        """测试登录成功"""
        from flask import Flask
        from flask_jwt_extended import JWTManager
        from routes.auth import auth_bp

        test_app = Flask(__name__)
        test_app.register_blueprint(auth_bp, url_prefix='/api/admin')
        test_app.config['SECRET_KEY'] = 'test-secret'
        test_app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'

        # 初始化 JWT
        JWTManager(test_app)

        client = test_app.test_client()

        with patch('routes.auth.Config') as mock_config:
            mock_config_instance = MagicMock()
            mock_config_instance.ADMIN_PASSWORD = 'admin123'
            mock_config_instance.ADMIN_USERNAME = 'admin'
            mock_config_instance.JWT_ACCESS_TOKEN_EXPIRES = 3600
            mock_config_instance.JWT_REMEMBER_TOKEN_EXPIRES = 86400
            mock_config.return_value = mock_config_instance

            response = client.post('/api/admin/login',
                json={'password': 'admin123'},
                content_type='application/json'
            )

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['code'] == 0
            assert 'token' in data

    def test_login_wrong_password(self, app):
        """测试登录密码错误"""
        from flask import Flask
        from flask_jwt_extended import JWTManager
        from routes.auth import auth_bp

        test_app = Flask(__name__)
        test_app.register_blueprint(auth_bp, url_prefix='/api/admin')
        test_app.config['SECRET_KEY'] = 'test-secret'
        test_app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'

        JWTManager(test_app)

        client = test_app.test_client()

        with patch('routes.auth.Config') as mock_config:
            mock_config_instance = MagicMock()
            mock_config_instance.ADMIN_PASSWORD = 'admin123'
            mock_config_instance.ADMIN_USERNAME = 'admin'
            mock_config_instance.JWT_ACCESS_TOKEN_EXPIRES = 3600
            mock_config_instance.JWT_REMEMBER_TOKEN_EXPIRES = 86400
            mock_config.return_value = mock_config_instance

            response = client.post('/api/admin/login',
                json={'password': 'wrong'},
                content_type='application/json'
            )

            assert response.status_code == 401
            data = json.loads(response.data)
            assert data['code'] == 1

    def test_login_missing_password(self, app):
        """测试登录缺少密码"""
        from flask import Flask
        from flask_jwt_extended import JWTManager
        from routes.auth import auth_bp

        test_app = Flask(__name__)
        test_app.register_blueprint(auth_bp, url_prefix='/api/admin')
        test_app.config['SECRET_KEY'] = 'test-secret'
        test_app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'

        JWTManager(test_app)

        client = test_app.test_client()

        with patch('routes.auth.Config') as mock_config:
            mock_config_instance = MagicMock()
            mock_config_instance.ADMIN_PASSWORD = 'admin123'
            mock_config_instance.ADMIN_USERNAME = 'admin'
            mock_config_instance.JWT_ACCESS_TOKEN_EXPIRES = 3600
            mock_config_instance.JWT_REMEMBER_TOKEN_EXPIRES = 86400
            mock_config.return_value = mock_config_instance

            response = client.post('/api/admin/login',
                json={},
                content_type='application/json'
            )

            assert response.status_code == 401
