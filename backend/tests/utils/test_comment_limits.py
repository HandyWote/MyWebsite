import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch


class TestCommentLimitChecker:
    """测试 CommentLimitChecker 类"""

    def test_init_default_config(self):
        """测试默认配置"""
        from utils.comment_limits import CommentLimitChecker
        config = {
            'COMMENT_LIMIT_ENABLED': True,
            'COMMENT_LIMIT_TIME_WINDOW': 24,
            'COMMENT_LIMIT_MAX_COUNT': 3,
            'COMMENT_LIMIT_EXEMPT_ADMIN': True
        }
        checker = CommentLimitChecker(config)
        assert checker.enabled is True
        assert checker.time_window_hours == 24
        assert checker.max_comments == 3

    def test_init_disabled(self):
        """测试限制功能禁用"""
        from utils.comment_limits import CommentLimitChecker
        config = {'COMMENT_LIMIT_ENABLED': False}
        checker = CommentLimitChecker(config)
        assert checker.enabled is False


class TestValidateCommentLimitConfig:
    """测试配置验证"""

    def test_valid_config(self, app):
        """测试有效配置"""
        from utils.comment_limits import validate_comment_limit_config
        with app.app_context():
            app.config['COMMENT_LIMIT_TIME_WINDOW'] = 24
            app.config['COMMENT_LIMIT_MAX_COUNT'] = 3
            valid, msg = validate_comment_limit_config()
            assert valid is True

    def test_invalid_time_window(self, app):
        """测试无效时间窗口"""
        from utils.comment_limits import validate_comment_limit_config
        with app.app_context():
            app.config['COMMENT_LIMIT_TIME_WINDOW'] = 0
            valid, msg = validate_comment_limit_config()
            assert valid is False

    def test_invalid_max_count(self, app):
        """测试无效最大评论数"""
        from utils.comment_limits import validate_comment_limit_config
        with app.app_context():
            app.config['COMMENT_LIMIT_MAX_COUNT'] = -1
            valid, msg = validate_comment_limit_config()
            assert valid is False
