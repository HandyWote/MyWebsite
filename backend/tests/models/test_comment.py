import pytest
from datetime import datetime


class TestCommentModel:
    """测试 Comment 模型"""

    def test_comment_model_attributes(self):
        """测试 Comment 模型属性定义"""
        from models.comment import Comment

        # 验证表名
        assert Comment.__tablename__ == 'comments'

        # 验证列定义
        columns = {c.name for c in Comment.__table__.columns}
        expected_columns = {
            'id', 'article_id', 'author', 'email', 'content',
            'ip_address', 'user_agent', 'status', 'created_at', 'updated_at'
        }
        assert expected_columns.issubset(columns)

    def test_comment_creation(self):
        """测试评论创建"""
        from models.comment import Comment

        comment = Comment(
            article_id=1,
            author='Test User',
            content='Test Comment',
            status='normal'  # SQLAlchemy 默认值在添加到 session 时才生效
        )

        assert comment.article_id == 1
        assert comment.author == 'Test User'
        assert comment.content == 'Test Comment'
        assert comment.status == 'normal'

    def test_comment_with_email(self):
        """测试带邮箱的评论"""
        from models.comment import Comment

        comment = Comment(
            article_id=1,
            author='User',
            content='Content',
            email='test@example.com'
        )

        assert comment.email == 'test@example.com'

    def test_comment_ip_address(self):
        """测试评论 IP 地址"""
        from models.comment import Comment

        comment = Comment(
            article_id=1,
            author='User',
            content='Content',
            ip_address='192.168.1.1'
        )

        assert comment.ip_address == '192.168.1.1'

    def test_comment_status(self):
        """测试评论状态"""
        from models.comment import Comment

        comment_normal = Comment(article_id=1, author='User', content='Content', status='normal')
        comment_pending = Comment(article_id=1, author='User', content='Content', status='pending')
        comment_spam = Comment(article_id=1, author='User', content='Content', status='spam')

        assert comment_normal.status == 'normal'
        assert comment_pending.status == 'pending'
        assert comment_spam.status == 'spam'

    def test_comment_to_dict(self):
        """测试评论序列化"""
        from models.comment import Comment

        comment = Comment(
            article_id=1,
            author='User',
            content='Content',
            email='test@example.com'
        )
        # 手动设置 id 用于测试
        comment.id = 1

        result = comment.to_dict()
        assert 'id' in result
        assert result['author'] == 'User'
        assert result['email'] == 'test@example.com'
        assert result['content'] == 'Content'
