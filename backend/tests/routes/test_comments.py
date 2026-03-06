import pytest
import json
from unittest.mock import patch, MagicMock


class TestCommentsRoutes:
    """测试评论 API"""

    def test_create_comment_missing_author(self):
        """测试创建评论缺少作者"""
        from flask import Flask
        from routes.comment import comment_bp

        app = Flask(__name__)
        app.register_blueprint(comment_bp, url_prefix='/api')
        app.config['TESTING'] = True

        with patch('routes.comment.Article') as mock_article:
            # Mock article exists
            mock_art = MagicMock()
            mock_art.id = 1
            mock_article.query.filter_by.return_value.first.return_value = mock_art

            client = app.test_client()
            response = client.post(
                '/api/articles/1/comments',
                json={'content': 'Content'},
                content_type='application/json'
            )

            data = json.loads(response.data)
            # 验证返回错误响应（code 不为 0）
            assert data['code'] != 0

    def test_create_comment_missing_content(self):
        """测试创建评论缺少内容"""
        from flask import Flask
        from routes.comment import comment_bp

        app = Flask(__name__)
        app.register_blueprint(comment_bp, url_prefix='/api')
        app.config['TESTING'] = True

        with patch('routes.comment.Article') as mock_article:
            mock_art = MagicMock()
            mock_art.id = 1
            mock_article.query.filter_by.return_value.first.return_value = mock_art

            client = app.test_client()
            response = client.post(
                '/api/articles/1/comments',
                json={'author': 'User'},
                content_type='application/json'
            )

            data = json.loads(response.data)
            # 验证返回错误响应（code 不为 0）
            assert data['code'] != 0

    def test_create_comment_article_not_found(self):
        """测试对不存在的文章评论"""
        from flask import Flask
        from routes.comment import comment_bp

        app = Flask(__name__)
        app.register_blueprint(comment_bp, url_prefix='/api')
        app.config['TESTING'] = True

        with patch('routes.comment.Article') as mock_article:
            mock_article.query.filter_by.return_value.first.return_value = None

            client = app.test_client()
            response = client.post(
                '/api/articles/99999/comments',
                json={'author': 'User', 'content': 'Content'},
                content_type='application/json'
            )

            data = json.loads(response.data)
            # 验证返回错误响应（code 不为 0）
            assert data['code'] != 0
