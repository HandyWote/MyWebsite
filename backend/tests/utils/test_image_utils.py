import pytest
import os
from utils.image_utils import should_convert_to_webp, get_webp_filename


def test_should_convert_to_webp():
    """测试需要转换的图片格式"""
    # 需要转换的格式
    assert should_convert_to_webp('image.jpg') is True
    assert should_convert_to_webp('image.jpeg') is True
    assert should_convert_to_webp('image.png') is True
    assert should_convert_to_webp('image.JPG') is True  # 大写

    # 不需要转换的格式
    assert should_convert_to_webp('image.webp') is False
    assert should_convert_to_webp('image.gif') is False
    assert should_convert_to_webp('image.bmp') is False
    assert should_convert_to_webp('noextension') is False


def test_get_webp_filename():
    """测试生成 webp 文件名"""
    assert get_webp_filename('image.jpg') == 'image.webp'
    assert get_webp_filename('photo.png') == 'photo.webp'
    assert get_webp_filename('pic.webp') == 'pic.webp'
    assert get_webp_filename('photo.jpeg') == 'photo.webp'
    assert get_webp_filename('image') == 'image.webp'  # 无扩展名
