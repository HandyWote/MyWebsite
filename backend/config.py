"""
配置文件（推荐生产环境用 .env 文件 + os.environ.get() 方式）
"""
import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    # 基础安全
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-jwt-secret-here')

    # 管理员账号
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'yourpassword')

    # 数据库
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'postgresql://username:password@localhost:5432/yourdb')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 上传相关
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'backend/uploads')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 5 * 1024 * 1024))  # 5MB
    ALLOWED_IMAGE_EXTENSIONS = set(os.environ.get('ALLOWED_IMAGE_EXTENSIONS', 'jpg,jpeg,png,webp').split(','))

    # OpenAI 配置
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'sk-xxxx')
    OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-3.5-turbo')

    # JWT 有效期
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 86400))  # 1天
    JWT_REMEMBER_TOKEN_EXPIRES = int(os.environ.get('JWT_REMEMBER_TOKEN_EXPIRES', 604800))  # 7天

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 