import pytest
from unittest.mock import patch, MagicMock


class TestAdminRequired:
    """测试 admin_required 装饰器"""

    def test_admin_required_decorator_non_admin(self, app):
        """测试 admin_required 装饰器 - 非管理员被拒绝"""
        from utils.jwt import admin_required
        from flask import jsonify

        @admin_required
        def protected_route():
            return jsonify({'message': 'success'})

        # 创建非管理员身份的 mock
        with app.app_context():
            with patch('utils.jwt.verify_jwt_in_request') as mock_verify:
                with patch('utils.jwt.get_jwt_identity', return_value='user'):
                    response = protected_route()
                    # 验证返回 403
                    assert response[1] == 403

    def test_admin_required_decorator_admin(self, app):
        """测试 admin_required 装饰器 - 管理员允许访问"""
        from utils.jwt import admin_required
        from flask import jsonify

        @admin_required
        def protected_route():
            return jsonify({'message': 'success'})

        # 创建管理员身份的 mock
        with app.app_context():
            with patch('utils.jwt.verify_jwt_in_request'):
                with patch('utils.jwt.get_jwt_identity', return_value='admin'):
                    response = protected_route()
                    # 验证返回成功 (Flask jsonify 返回 Response 对象)
                    assert response.status_code == 200

    def test_admin_required_decorator_no_identity(self, app):
        """测试 admin_required 装饰器 - 无身份"""
        from utils.jwt import admin_required
        from flask import jsonify

        @admin_required
        def protected_route():
            return jsonify({'message': 'success'})

        with app.app_context():
            with patch('utils.jwt.verify_jwt_in_request'):
                with patch('utils.jwt.get_jwt_identity', return_value=None):
                    response = protected_route()
                    # 验证返回 403
                    assert response[1] == 403
