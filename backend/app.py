from flask import Flask
from flask_cors import CORS
from setup import Config
from extensions import db, jwt, scheduler, socketio
from flask_socketio import SocketIO, emit
from routes import register_all_blueprints
from models.site_block import SiteBlock
from models.skill import Skill
from models.contact import Contact
from models.article import Article
from models.avatar import Avatar
from models.comment import Comment
from datetime import datetime
import os
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    """Flask应用工厂函数"""
    app = Flask(__name__)
    
    # 加载配置
    config = Config()
    
    # 设置所有配置项
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
    
    # 数据库连接池配置
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_size": 10,
        "pool_recycle": 120,
        "pool_pre_ping": True,
        "max_overflow": 20,
    }

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
    
    # 检测运行环境并配置SocketIO
    is_gunicorn = "gunicorn" in os.environ.get("SERVER_SOFTWARE", "")
    
    if is_gunicorn:
        # Gunicorn环境下使用threading模式
        socketio.init_app(app, cors_allowed_origins="*", async_mode='threading')
        logger.info("SocketIO initialized with threading mode for Gunicorn")
    else:
        # 开发环境下使用完整WebSocket支持
        socketio.init_app(app, cors_allowed_origins="*", path='/socket.io/')
        logger.info("SocketIO initialized with full WebSocket support")

    # 注册路由
    from routes import register_all_blueprints
    register_all_blueprints(app)

    # 确保上传目录存在 - 使用绝对路径
    upload_dir = os.path.abspath(app.config['UPLOAD_FOLDER'])
    os.makedirs(upload_dir, exist_ok=True)
    logger.info(f"Upload directory ensured: {upload_dir}")

    # 添加健康检查路由
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': 'Flask app is running'}, 200

    # 在应用上下文中初始化数据库
    with app.app_context():
        try:
            # 测试数据库连接
            db.engine.execute('SELECT 1')
            logger.info("Database connection successful")
            
            # 创建表结构
            db.create_all()
            logger.info("Database tables created/verified")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            # 在生产环境中不要因为数据库问题而停止应用启动
            pass

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

# WebSocket 路由
@socketio.on('connect', namespace='/skills')
def ws_skills_connect():
    logger.info('WebSocket /skills connected')
    socketio.emit('message', {'msg': 'skills ws connected'}, namespace='/skills')

@socketio.on('connect', namespace='/contacts')
def ws_contacts_connect():
    logger.info('WebSocket /contacts connected')
    socketio.emit('message', {'msg': 'contacts ws connected'}, namespace='/contacts')

@socketio.on('connect', namespace='/avatars')
def ws_avatars_connect():
    logger.info('WebSocket /avatars connected')
    socketio.emit('message', {'msg': 'avatars ws connected'}, namespace='/avatars')

@socketio.on('connect', namespace='/articles')
def ws_articles_connect():
    logger.info('WebSocket /articles connected')
    socketio.emit('message', {'msg': 'articles ws connected'}, namespace='/articles')

@socketio.on('connect', namespace='/logs')
def ws_logs_connect():
    logger.info('WebSocket /logs connected')
    socketio.emit('message', {'msg': 'logs ws connected'}, namespace='/logs')

if __name__ == '__main__':
    # 开发环境启动
    try:
        from gevent import monkey
        monkey.patch_all()
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    except ImportError:
        app.run(host='0.0.0.0', port=5000, debug=True)
