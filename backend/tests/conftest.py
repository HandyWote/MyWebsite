import pytest
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope='session')
def app():
    """创建测试应用（不需要数据库）"""
    from utils.comment_limits import CommentLimitChecker
    from utils.response import success, error

    # 创建一个简单的模拟 Flask app
    from flask import Flask
    test_app = Flask(__name__)
    test_app.config['TESTING'] = True
    test_app.config['COMMENT_LIMIT_ENABLED'] = True
    test_app.config['COMMENT_LIMIT_TIME_WINDOW'] = 24
    test_app.config['COMMENT_LIMIT_MAX_COUNT'] = 3
    test_app.config['COMMENT_LIMIT_EXEMPT_ADMIN'] = True

    return test_app


@pytest.fixture(scope='function')
def client(app):
    """创建测试客户端"""
    return app.test_client()
