from flask import Flask
from flask_cors import CORS
from setup import Config  # Config类已经处理了环境变量加载
from extensions import db, jwt, scheduler, socketio
import os

import logging
from flask_socketio import SocketIO, emit
from routes import register_all_blueprints
from models.site_block import SiteBlock
from models.skill import Skill
from models.contact import Contact
from models.article import Article
from models.avatar import Avatar
from datetime import datetime

# 添加gevent支持检测
try:
    from gevent import monkey
    gevent_available = True
except ImportError:
    gevent_available = False

def create_app():
    app = Flask(__name__)
    config = Config()
    
    # 记录环境变量加载情况（用于调试）
    app.logger.info("Environment variables:")
    app.logger.info(f"DB_HOST: {os.environ.get('DB_HOST', 'Not set')}")
    app.logger.info(f"DB_PORT: {os.environ.get('DB_PORT', 'Not set')}")
    app.logger.info(f"DB_USER: {os.environ.get('DB_USER', 'Not set')}")
    app.logger.info(f"DB_PASSWORD: {'*' * len(os.environ.get('DB_PASSWORD', '')) if os.environ.get('DB_PASSWORD') else 'Not set'}")
    app.logger.info(f"DB_NAME: {os.environ.get('DB_NAME', 'Not set')}")
    app.logger.info(f"SECRET_KEY: {'*' * len(os.environ.get('SECRET_KEY', '')) if os.environ.get('SECRET_KEY') else 'Not set'}")
    app.logger.info(f"SQLALCHEMY_DATABASE_URI: {config.SQLALCHEMY_DATABASE_URI}")
    
    # 正确设置所有配置项
    app.config["SQLALCHEMY_DATABASE_URI"] = config.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = config.SQLALCHEMY_TRACK_MODIFICATIONS
    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["JWT_SECRET_KEY"] = config.JWT_SECRET_KEY
    app.config["UPLOAD_FOLDER"] = config.UPLOAD_FOLDER
    app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH
    app.config["ALLOWED_IMAGE_EXTENSIONS"] = config.ALLOWED_IMAGE_EXTENSIONS
    app.config["OPENAI_API_KEY"] = config.OPENAI_API_KEY
    app.config["OPENAI_MODEL"] = config.OPENAI_MODEL
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = config.JWT_ACCESS_TOKEN_EXPIRES
    app.config["JWT_REMEMBER_TOKEN_EXPIRES"] = config.JWT_REMEMBER_TOKEN_EXPIRES
    # 添加数据库连接池配置
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_size": 10,
        "pool_recycle": 120,
        "pool_pre_ping": True,
        "max_overflow": 20,
    }
    # 其它配置项如有需要可继续添加

    # 启用 CORS - 修复跨域问题
    CORS(app, 
         resources={
             r"/api/*": {
                 "origins": [
                     "http://localhost:3131", 
                     "http://localhost:5173", 
                     "http://localhost:3000",
                     "https://www.handywote.site",
                     "https://handywote.site",
                     "http://www.handywote.site",
                     "http://handywote.site",
                     "https://webbackend.handywote.site"
                 ],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
                 "expose_headers": ["Content-Type", "Authorization"],
                 "supports_credentials": True,
                 "max_age": 86400
             }
         },
         origins=[
             "http://localhost:3131", 
             "http://localhost:5173", 
             "http://localhost:3000",
             "https://www.handywote.site",
             "https://handywote.site",
             "http://www.handywote.site",
             "http://handywote.site",
             "https://webbackend.handywote.site"
         ],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
         expose_headers=["Content-Type", "Authorization"],
         supports_credentials=True,
         max_age=86400
    )

    # 初始化扩展
    db.init_app(app)
    jwt.init_app(app)
    scheduler.init_app(app)
    
    # 检测是否在Gunicorn环境中运行
    is_gunicorn = "gunicorn" in os.environ.get("SERVER_SOFTWARE", "")
    
    # 根据运行环境配置SocketIO
    if is_gunicorn:
        # Gunicorn环境下禁用WebSocket支持以避免套接字错误
        socketio.init_app(app, cors_allowed_origins="*", async_mode='threading')
    else:
        # 开发环境下启用完整的WebSocket支持
        socketio.init_app(app, cors_allowed_origins="*", path='/socket.io/')

    # 注册所有蓝图
    register_all_blueprints(app)

    # 确保上传目录存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # 初始化数据库
    init_database(app)

    return app


def init_database(app):
    """初始化数据库表结构和示例数据"""
    try:
        with app.app_context():
            app.logger.info("开始初始化数据库...")
            
            # 创建表结构
            db.create_all()
            app.logger.info("✅ 数据库表创建成功")
            
            # 插入示例数据（仅在表为空时）
            if not SiteBlock.query.first():
                blocks = [
                    SiteBlock(name='home', content={"title": "HandyWote", "desc": "少年侠气交结五都雄！"}),
                    SiteBlock(name='about', content={"desc": "汕头大学 | 黄应辉"}),
                    SiteBlock(name='skills', content={}),
                    SiteBlock(name='contact', content={}),
                ]
                db.session.add_all(blocks)
                db.session.commit()
                app.logger.info("✅ 示例分块内容插入成功")
            
            if not Skill.query.first():
                skills = [
                    Skill(name='Python', description='熟练掌握 Python 编程', level=90),
                    Skill(name='React', description='熟悉 React 前端开发', level=85),
                ]
                db.session.add_all(skills)
                db.session.commit()
                app.logger.info("✅ 示例技能插入成功")
            
            if not Contact.query.first():
                contacts = [
                    Contact(type='email', value='handywote@example.com'),
                    Contact(type='wechat', value='handywote123'),
                ]
                db.session.add_all(contacts)
                db.session.commit()
                app.logger.info("✅ 示例联系方式插入成功")
            
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
                app.logger.info("✅ 示例文章插入成功")
                
            app.logger.info("🎉 数据库初始化完成！")
                
    except Exception as e:
        app.logger.error(f"❌ 数据库初始化失败: {e}")
        import traceback
        app.logger.error(traceback.format_exc())
        # 不抛出异常，让应用继续启动，但数据库可能未正确初始化


app = create_app()

# ========== WebSocket 路由 ==========
@socketio.on('connect', namespace='/skills')
def ws_skills_connect():
    print('WebSocket /skills connected')
    emit('message', {'msg': 'skills ws connected'})

@socketio.on('connect', namespace='/contacts')
def ws_contacts_connect():
    print('WebSocket /contacts connected')
    emit('message', {'msg': 'contacts ws connected'})

@socketio.on('connect', namespace='/avatars')
def ws_avatars_connect():
    print('WebSocket /avatars connected')
    emit('message', {'msg': 'avatars ws connected'})

@socketio.on('connect', namespace='/articles')
def ws_articles_connect():
    print('WebSocket /articles connected')
    emit('message', {'msg': 'articles ws connected'})

@socketio.on('connect', namespace='/logs')
def ws_logs_connect():
    print('WebSocket /logs connected')
    emit('message', {'msg': 'logs ws connected'})

if __name__ == '__main__':
    # -----------------------------
    # 使用 gevent 启动，支持 WebSocket
    # -----------------------------
    if gevent_available:
        monkey.patch_all()  # 必须：打补丁以支持协程和 WebSocket
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
