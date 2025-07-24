#!/usr/bin/env python3
"""
集成设置脚本
包含数据库配置、初始化、启动等功能
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
import os
# 加载根目录下的.env
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(root_dir, '.env'))

class Config:
    """应用配置类"""
    # 基础安全
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-change-in-production')

    # 管理员账号
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

    # 数据库配置
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '5432')
    DB_USER = os.environ.get('DB_USER', 'postgres')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'password')
    DB_NAME = os.environ.get('DB_NAME', 'mywebsite')
    
    @property
    def SQLALCHEMY_DATABASE_URI(self):
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 上传相关
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 5 * 1024 * 1024))  # 5MB
    ALLOWED_IMAGE_EXTENSIONS = set(os.environ.get('ALLOWED_IMAGE_EXTENSIONS', 'jpg,jpeg,png,webp').split(','))

    # OpenAI 配置
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'sk-xxxx')
    OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-3.5-turbo')

    # JWT 有效期
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 86400))  # 1天
    JWT_REMEMBER_TOKEN_EXPIRES = int(os.environ.get('JWT_REMEMBER_TOKEN_EXPIRES', 604800))  # 7天

    # 开发环境配置
    DEBUG = True

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

# JWT 有效期
JWT_ACCESS_TOKEN_EXPIRES=86400
JWT_REMEMBER_TOKEN_EXPIRES=604800
"""
    
    if not os.path.exists('.env'):
        with open('.env', 'w', encoding='utf-8') as f:
            f.write(env_content)
        print("✅ .env 文件创建成功")
    else:
        print("ℹ️  .env 文件已存在")

def setup_database():
    """设置 PostgreSQL 数据库"""
    config = Config()
    print("=== 环境变量实际读取 ===")
    print("DB_HOST:", repr(config.DB_HOST))
    print("DB_PORT:", repr(config.DB_PORT))
    print("DB_USER:", repr(config.DB_USER))
    print("DB_PASSWORD:", repr(config.DB_PASSWORD))
    print("DB_NAME:", repr(config.DB_NAME))
    print("SQLALCHEMY_DATABASE_URI:", config.SQLALCHEMY_DATABASE_URI)
    print("======================")
    try:
        print(f"准备连接数据库: host={config.DB_HOST}, port={config.DB_PORT}, user={config.DB_USER}, password={config.DB_PASSWORD}, database={config.DB_NAME}")
        conn = psycopg2.connect(
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            database=config.DB_NAME
        )
        print(f"连接到 {config.DB_NAME} 数据库成功")
        conn.close()
    except Exception as e:
        print("❌ 数据库连接或操作异常！")
        print("异常类型：", type(e))
        print("异常内容：", e)
        import traceback
        traceback.print_exc()
        return False
    return True

def init_database():
    """初始化数据库表结构和示例数据"""
    try:
        # 导入应用和模型
        from app import app
        from extensions import db
        from models.site_block import SiteBlock
        from models.skill import Skill
        from models.contact import Contact
        from models.article import Article
        from models.avatar import Avatar
        from datetime import datetime
        
        with app.app_context():
            print("准备初始化数据库表结构，连接字符串：", db.engine.url)
            # 创建表结构
            db.create_all()
            print("✅ 数据库表创建成功")
            
            # 插入示例数据
            if not SiteBlock.query.first():
                blocks = [
                    SiteBlock(name='home', content={"title": "HandyWote", "desc": "少年侠气交结五都雄！"}),
                    SiteBlock(name='about', content={"desc": "汕头大学 | 黄应辉"}),
                    SiteBlock(name='skills', content={}),
                    SiteBlock(name='contact', content={}),
                ]
                db.session.add_all(blocks)
                db.session.commit()
                print("✅ 示例分块内容插入成功")
            
            if not Skill.query.first():
                skills = [
                    Skill(name='Python', description='熟练掌握 Python 编程', level=90),
                    Skill(name='React', description='熟悉 React 前端开发', level=85),
                ]
                db.session.add_all(skills)
                db.session.commit()
                print("✅ 示例技能插入成功")
            
            if not Contact.query.first():
                contacts = [
                    Contact(type='email', value='handywote@example.com'),
                    Contact(type='wechat', value='handywote123'),
                ]
                db.session.add_all(contacts)
                db.session.commit()
                print("✅ 示例联系方式插入成功")
            
            if not Article.query.first():
                article = Article(
                    title='Hello World',
                    category='前端开发',
                    tags='React,JavaScript',
                    cover='',
                    summary='这是一篇示例文章',
                    content='# Hello World\n欢迎使用管理后台！'
                )
                db.session.add(article)
                db.session.commit()
                print("✅ 示例文章插入成功")
                
    except Exception as e:
        print("❌ 数据库初始化失败: ", e)
        import traceback
        traceback.print_exc()
        return False
    
    return True

def start_server():
    """启动后端服务（支持 WebSocket）"""
    try:
        from app import app, socketio
        print("🚀 启动后端服务...")
        print("📍 服务地址: http://localhost:5000")
        print("📚 API 文档: http://localhost:5000/api")
        print("🔧 管理后台: http://localhost:5000/admin")
        print("⏹️  按 Ctrl+C 停止服务")
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        print(f"❌ 启动服务失败: {e}")

def main():
    """主函数"""
    print("🎯 网站后端集成设置工具")
    print("=" * 50)
    
    # 创建 .env 文件
    create_env_file()
    
    # 设置数据库
    print("\n📊 设置数据库...")
    if not setup_database():
        print("❌ 数据库设置失败，请检查 PostgreSQL 配置")
        return
    
    # 初始化数据库
    print("\n🗄️  初始化数据库...")
    if not init_database():
        print("❌ 数据库初始化失败")
        return
    
    print("\n🎉 设置完成！")
    print("=" * 50)
    
    # 询问是否启动服务
    while True:
        choice = input("\n是否立即启动后端服务？(y/n): ").lower().strip()
        if choice in ['y', 'yes', '是']:
            start_server()
            break
        elif choice in ['n', 'no', '否']:
            print("💡 您可以稍后运行 'python setup.py' 来启动服务")
            break
        else:
            print("请输入 y 或 n")

if __name__ == '__main__':
    main() 