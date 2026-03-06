import pytest
import json
from unittest.mock import patch, MagicMock


class TestAdminArticlesRoutes:
    """测试管理员文章 API"""

    def test_get_articles_requires_auth(self):
        """测试获取文章需要认证"""
        from flask import Flask
        from flask_jwt_extended import JWTManager
        from routes.article import article_bp

        app = Flask(__name__)
        app.register_blueprint(article_bp, url_prefix='/api/admin')
        app.config['TESTING'] = True
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        app.config['JWT_TOKEN_LOCATION'] = ['headers']

        JWTManager(app)

        client = app.test_client()
        response = client.get('/api/admin/articles')

        # 无认证应该返回 401
        assert response.status_code == 401

    def test_create_article_invalid_content_type(self):
        """测试创建文章无效内容类型"""
        from flask import Flask
        from flask_jwt_extended import JWTManager, create_access_token
        from routes.article import article_bp

        app = Flask(__name__)
        app.register_blueprint(article_bp, url_prefix='/api/admin')
        app.config['TESTING'] = True
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        app.config['JWT_TOKEN_LOCATION'] = ['headers']

        JWTManager(app)

        with app.app_context():
            token = create_access_token(identity='admin')
            headers = {'Authorization': f'Bearer {token}'}

            client = app.test_client()
            response = client.post(
                '/api/admin/articles',
                headers=headers,
                json={'title': 'Test', 'content_type': 'invalid'}
            )

            # 应该返回错误（无效的内容类型）
            data = json.loads(response.data)
            assert data['code'] != 0
