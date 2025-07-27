#!/usr/bin/env python3
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_environment_variables():
    """加载环境变量，从backend目录的.env文件"""
    # 获取当前文件所在目录（backend目录）
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 在Docker容器中，工作目录是/app，.env文件在/app/.env
    # 在本地开发中，.env文件在backend目录下
    if os.path.exists('/app/.env'):
        # Docker环境：.env文件在/app目录下
        env_file_path = '/app/.env'
    else:
        # 本地开发环境：.env文件在backend目录下
        env_file_path = os.path.join(current_dir, '.env')

    # 尝试加载.env文件
    if os.path.exists(env_file_path):
        load_result = load_dotenv(env_file_path, override=True)
        logger.info(f"Environment variables loaded from: {env_file_path}")
        return True
    else:
        logger.info("No .env file found, using system environment variables")
        return False

# 立即加载环境变量
load_environment_variables()

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
        self.UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
        self.MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 5 * 1024 * 1024))
        self.ALLOWED_IMAGE_EXTENSIONS = set(os.environ.get('ALLOWED_IMAGE_EXTENSIONS', 'jpg,jpeg,png,webp').split(','))

        # OpenAI 配置
        self.OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'sk-xxxx')
        self.OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-3.5-turbo')
        self.OPENAI_API_URL = os.environ.get('OPENAI_API_URL', 'https://api.openai.com/v1')

        # JWT 有效期
        self.JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 86400))
        self.JWT_REMEMBER_TOKEN_EXPIRES = int(os.environ.get('JWT_REMEMBER_TOKEN_EXPIRES', 604800))

        # 开发环境配置
        self.DEBUG = os.environ.get('FLASK_ENV') != 'production'
        
        logger.info(f"Database URI: postgresql://{self.DB_USER}:***@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}")

def create_env_file():
    """创建 .env 文件"""
    env_content = """# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=mywebsite

# 安全配置
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 上传配置
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=5242880
ALLOWED_IMAGE_EXTENSIONS=jpg,jpeg,png,webp

# OpenAI 配置（可选）
OPENAI_API_KEY=sk-xxxx
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_URL=https://api.openai.com/v1

# JWT 有效期
JWT_ACCESS_TOKEN_EXPIRES=86400
JWT_REMEMBER_TOKEN_EXPIRES=604800
"""
    
    # 在backend目录下创建.env文件
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env_file_path = os.path.join(current_dir, '.env')
    
    if not os.path.exists(env_file_path):
        with open(env_file_path, 'w', encoding='utf-8') as f:
            f.write(env_content)
        logger.info(f"✅ .env 文件创建成功: {env_file_path}")
    else:
        logger.info(f"ℹ️  .env 文件已存在: {env_file_path}")

def setup_database():
    """设置数据库"""
    config = Config()
    
    try:
        # 连接到PostgreSQL服务器（不指定数据库）
        conn = psycopg2.connect(
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # 检查数据库是否存在
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{config.DB_NAME}'")
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute(f'CREATE DATABASE "{config.DB_NAME}"')
            logger.info(f"✅ 数据库 '{config.DB_NAME}' 创建成功")
        else:
            logger.info(f"ℹ️  数据库 '{config.DB_NAME}' 已存在")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ 数据库设置失败: {e}")
        return False

def init_database():
    """初始化数据库表结构"""
    try:
        from app import create_app
        app = create_app()
        
        with app.app_context():
            from extensions import db
            db.create_all()
            logger.info("✅ 数据库表结构初始化成功")
            
            # 插入示例数据的逻辑...
            
        return True
    except Exception as e:
        logger.error(f"❌ 数据库初始化失败: {e}")
        return False

def start_server():
    """启动后端服务"""
    try:
        from app import app, socketio
        logger.info("🚀 启动后端服务...")
        logger.info("📍 服务地址: http://localhost:5000")
        logger.info("📚 API 文档: http://localhost:5000/api")
        logger.info("🔧 管理后台: http://localhost:5000/admin")
        logger.info("⏹️  按 Ctrl+C 停止服务")
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        logger.error(f"❌ 启动服务失败: {e}")

def main():
    """主函数"""
    logger.info("🎯 网站后端集成设置工具")
    logger.info("=" * 50)
    
    # 创建 .env 文件
    create_env_file()
    
    # 设置数据库
    logger.info("\n📊 设置数据库...")
    if not setup_database():
        logger.error("❌ 数据库设置失败，请检查 PostgreSQL 配置")
        return
    
    # 初始化数据库
    logger.info("\n🗄️  初始化数据库...")
    if not init_database():
        logger.error("❌ 数据库初始化失败")
        return
    
    logger.info("\n🎉 设置完成！")
    logger.info("=" * 50)
    
    # 询问是否启动服务
    while True:
        choice = input("\n是否立即启动后端服务？(y/n): ").lower().strip()
        if choice in ['y', 'yes', '是']:
            start_server()
            break
        elif choice in ['n', 'no', '否']:
            logger.info("💡 您可以稍后运行 'python setup.py' 来启动服务")
            break
        else:
            print("请输入 y 或 n")

if __name__ == '__main__':
    main() 
