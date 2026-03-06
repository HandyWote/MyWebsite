import pytest
import json
from unittest.mock import patch, MagicMock


class TestPublicArticles:
    """测试公开文章 API"""

    def test_get_articles_empty(self):
        """测试获取空文章列表"""
        from flask import Flask
        from routes.public import public_bp

        app = Flask(__name__)
        app.register_blueprint(public_bp, url_prefix='/api')
        app.config['TESTING'] = True

        # Mock database query
        with patch('routes.public.Article') as mock_article:
            mock_query = MagicMock()
            mock_pagination = MagicMock()
            mock_pagination.items = []
            mock_pagination.total = 0
            mock_pagination.pages = 0
            mock_query.order_by.return_value.paginate.return_value = mock_pagination
            mock_article.query.filter_by.return_value = mock_query

            client = app.test_client()
            response = client.get('/api/articles')

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['code'] == 0
            assert data['articles'] == []

    def test_get_articles_with_data(self):
        """测试获取文章列表"""
        from flask import Flask
        from routes.public import public_bp

        app = Flask(__name__)
        app.register_blueprint(public_bp, url_prefix='/api')
        app.config['TESTING'] = True

        with patch('routes.public.Article') as mock_article:
            # Create mock article
            mock_art = MagicMock()
            mock_art.id = 1
            mock_art.title = 'Test'
            mock_art.category = 'Tech'
            mock_art.tags = 'react,javascript'
            mock_art.cover = None
            mock_art.summary = 'Summary'
            mock_art.created_at.isoformat.return_value = '2024-01-01'

            mock_query = MagicMock()
            mock_pagination = MagicMock()
            mock_pagination.items = [mock_art]
            mock_pagination.total = 1
            mock_pagination.pages = 1
            mock_query.order_by.return_value.paginate.return_value = mock_pagination
            mock_article.query.filter_by.return_value = mock_query

            client = app.test_client()
            response = client.get('/api/articles')

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['code'] == 0
            assert len(data['articles']) == 1

    def test_get_article_detail(self):
        """测试获取文章详情"""
        from flask import Flask
        from routes.public import public_bp

        app = Flask(__name__)
        app.register_blueprint(public_bp, url_prefix='/api')
        app.config['TESTING'] = True

        with patch('routes.public.Article') as mock_article:
            mock_art = MagicMock()
            mock_art.id = 1
            mock_art.title = 'Test'
            mock_art.category = 'Tech'
            mock_art.tags = 'react'
            mock_art.cover = '/cover.jpg'
            mock_art.summary = 'Summary'
            mock_art.content = '# Content'
            mock_art.content_type = 'markdown'
            mock_art.pdf_filename = None
            mock_art.created_at.isoformat.return_value = '2024-01-01'

            mock_query = MagicMock()
            mock_query.filter_by.return_value.first.return_value = mock_art
            mock_article.query = mock_query

            client = app.test_client()
            response = client.get('/api/articles/1')

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['code'] == 0
            assert data['title'] == 'Test'

    def test_get_article_not_found(self):
        """测试获取不存在的文章"""
        from flask import Flask
        from routes.public import public_bp

        app = Flask(__name__)
        app.register_blueprint(public_bp, url_prefix='/api')
        app.config['TESTING'] = True

        with patch('routes.public.Article') as mock_article:
            mock_query = MagicMock()
            mock_query.filter_by.return_value.first.return_value = None
            mock_article.query = mock_query

            client = app.test_client()
            response = client.get('/api/articles/99999')

            assert response.status_code == 404

    def test_get_categories(self):
        """测试获取分类"""
        from flask import Flask
        from routes.public import public_bp

        app = Flask(__name__)
        app.register_blueprint(public_bp, url_prefix='/api')
        app.config['TESTING'] = True

        with patch('routes.public.db') as mock_db:
            mock_result = [('Tech',), ('Life',)]
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.distinct.return_value.all.return_value = mock_result
            mock_db.session = mock_session

            client = app.test_client()
            response = client.get('/api/categories')

            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'categories' in data

    def test_get_tags(self):
        """测试获取标签"""
        from flask import Flask
        from routes.public import public_bp

        app = Flask(__name__)
        app.register_blueprint(public_bp, url_prefix='/api')
        app.config['TESTING'] = True

        with patch('routes.public.Article') as mock_article:
            mock_art = MagicMock()
            mock_art.tags = 'react,javascript'

            mock_query = MagicMock()
            mock_query.filter_by.return_value.all.return_value = [mock_art]
            mock_article.query = mock_query

            client = app.test_client()
            response = client.get('/api/tags')

            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'tags' in data
