import pytest
from utils.response import success, error


def test_success_with_data():
    """测试 success 函数返回正确的数据结构"""
    data = {'id': 1, 'name': 'test'}
    result = success(data)
    assert result['code'] == 0
    assert result['msg'] == 'success'
    assert result['data'] == data


def test_success_with_custom_msg():
    """测试 success 函数自定义消息"""
    result = success(msg='操作成功')
    assert result['msg'] == '操作成功'


def test_success_with_no_data():
    """测试 success 函数无数据参数"""
    result = success()
    assert result['code'] == 0
    assert result['data'] is None


def test_error_default():
    """测试 error 函数默认参数"""
    result = error()
    assert result['code'] == 1
    assert result['msg'] == 'error'


def test_error_custom_message():
    """测试 error 函数自定义消息"""
    result = error('自定义错误')
    assert result['msg'] == '自定义错误'


def test_error_custom_code():
    """测试 error 函数自定义状态码"""
    result = error(code=404)
    assert result['code'] == 404


def test_error_with_data():
    """测试 error 函数带数据"""
    result = error(data={'field': 'error'})
    assert result['data'] == {'field': 'error'}
