#!/usr/bin/env python3
"""
配置模块
"""

import os

class Config:
    """应用配置类"""
    def __init__(self):
        # 基础安全
        self.SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
        self.JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-change-in-production')

        # 管理员账号
        self.ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
        self.ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

        # 数据库配置
        self.DB_HOST = os.environ.get('DB_HOST', 'localhost')
        self.DB_PORT = os.environ.get('DB_PORT', '5432')
        self.DB_USER = os.environ.get('DB_USER', 'postgres')
        self.DB_PASSWORD = os.environ.get('DB_PASSWORD', 'password')
        self.DB_NAME = os.environ.get('DB_NAME', 'mywebsite')
        
        # 构建数据库URI
        self.SQLALCHEMY_DATABASE_URI = f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        self.SQLALCHEMY_TRACK_MODIFICATIONS = False

        # 上传相关
        upload_folder = os.environ.get('UPLOAD_FOLDER', 'uploads')
        # 检查是否在Docker容器中
        if os.path.exists('/app/.dockerenv'):
            # 在Docker容器中，使用/app/uploads
            upload_folder = '/app/uploads'
        elif not os.path.isabs(upload_folder):
            # 在开发环境中，使用绝对路径
            upload_folder = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), upload_folder))
        self.UPLOAD_FOLDER = upload_folder
        self.MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 20 * 1024 * 1024))  # 增加到20MB支持PDF文件
        self.ALLOWED_IMAGE_EXTENSIONS = set(os.environ.get('ALLOWED_IMAGE_EXTENSIONS', 'jpg,jpeg,png,webp').split(','))
        self.ALLOWED_PDF_EXTENSIONS = {'pdf'}  # 新增：支持PDF文件格式

        # OpenAI 配置
        self.OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'sk-xxxx')
        self.OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-3.5-turbo')
        self.OPENAI_API_URL = os.environ.get('OPENAI_API_URL', 'https://api.openai.com/v1')

        # JWT 有效期
        self.JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 86400))
        self.JWT_REMEMBER_TOKEN_EXPIRES = int(os.environ.get('JWT_REMEMBER_TOKEN_EXPIRES', 604800))

        # 评论限制配置
        self.COMMENT_LIMIT_ENABLED = os.environ.get('COMMENT_LIMIT_ENABLED', 'true').lower() == 'true'
        self.COMMENT_LIMIT_TIME_WINDOW = int(os.environ.get('COMMENT_LIMIT_TIME_WINDOW', 24))  # 小时
        self.COMMENT_LIMIT_MAX_COUNT = int(os.environ.get('COMMENT_LIMIT_MAX_COUNT', 1))  # 每个时间窗口内最大评论数
        self.COMMENT_LIMIT_EXEMPT_ADMIN = os.environ.get('COMMENT_LIMIT_EXEMPT_ADMIN', 'true').lower() == 'true'  # 是否豁免管理员

        # 开发环境配置
        self.DEBUG = os.environ.get('FLASK_ENV') != 'production'