"""
配置文件示例
请复制此文件为 config.py 并修改相应的配置
"""

import os

class Config:
    """基础配置类"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    # 修改为你的数据库连接信息
    SQLALCHEMY_DATABASE_URI = 'postgresql://username:password@localhost/handywote_articles'

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    # 使用环境变量获取数据库连接
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 