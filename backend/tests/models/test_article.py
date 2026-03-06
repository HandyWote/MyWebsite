import pytest
from datetime import datetime


class TestArticleModel:
    """测试 Article 模型"""

    def test_article_model_attributes(self):
        """测试 Article 模型属性定义"""
        from models.article import Article
        from extensions import db

        # 验证表名
        assert Article.__tablename__ == 'article'

        # 验证列定义
        columns = {c.name for c in Article.__table__.columns}
        expected_columns = {
            'id', 'title', 'category', 'tags', 'cover', 'summary',
            'content', 'content_type', 'pdf_filename', 'created_at',
            'updated_at', 'deleted_at'
        }
        assert expected_columns.issubset(columns)

    def test_article_creation(self):
        """测试文章创建"""
        from models.article import Article

        article = Article(
            title='Test Article',
            category='Test',
            tags='tag1,tag2',
            content='# Test Content'
        )

        assert article.title == 'Test Article'
        assert article.category == 'Test'
        assert article.tags == 'tag1,tag2'
        assert article.content == '# Test Content'
        assert article.deleted_at is None

    def test_article_content_type(self):
        """测试文章内容类型"""
        from models.article import Article

        article_md = Article(title='MD', content_type='markdown')
        article_pdf = Article(title='PDF', content_type='pdf', pdf_filename='test.pdf')

        assert article_md.content_type == 'markdown'
        assert article_pdf.content_type == 'pdf'
        assert article_pdf.pdf_filename == 'test.pdf'

    def test_article_category_and_tags(self):
        """测试文章分类和标签"""
        from models.article import Article

        article = Article(
            title='Test',
            category='Tech',
            tags='react,javascript,python'
        )

        assert article.category == 'Tech'
        assert article.tags == 'react,javascript,python'

    def test_article_soft_delete(self):
        """测试文章软删除"""
        from models.article import Article
        from datetime import datetime

        article = Article(title='Test')
        # 模拟软删除 - 只有在添加到数据库时才会自动设置
        article.deleted_at = datetime.utcnow()

        assert article.deleted_at is not None
