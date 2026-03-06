#!/usr/bin/env python3

from flask import Flask, request, make_response
from flask_cors import CORS
from extensions import db, jwt, scheduler, socketio, cors
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
import sys
import logging
import argparse

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 环境变量加载功能
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
    try:
        import dotenv
        if os.path.exists(env_file_path):
            dotenv.load_dotenv(env_file_path, override=True)
            logger.info(f"Environment variables loaded from: {env_file_path}")
            return True
        else:
            logger.info("No .env file found, using system environment variables")
            return False
    except ImportError:
        logger.warning("dotenv not installed, using system environment variables")
        return False

# 立即加载环境变量
load_environment_variables()

# 创建默认 .env 文件
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

# 评论限制配置
COMMENT_LIMIT_ENABLED=true
COMMENT_LIMIT_TIME_WINDOW=24
COMMENT_LIMIT_MAX_COUNT=3
COMMENT_LIMIT_EXEMPT_ADMIN=true
"""
    
    # 在backend目录下创建.env文件
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env_file_path = os.path.join(current_dir, '.env')
    
    if not os.path.exists(env_file_path):
        with open(env_file_path, 'w', encoding='utf-8') as f:
            f.write(env_content)
        logger.info(f"✅ .env 文件创建成功: {env_file_path}")
        return True
    else:
        logger.info(f"ℹ️  .env 文件已存在: {env_file_path}")
        return False

def create_app():
    """Flask应用工厂函数"""
    app = Flask(__name__)
    
    # 加载配置
    from config import Config
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
    
    # 评论限制配置
    app.config["COMMENT_LIMIT_ENABLED"] = config.COMMENT_LIMIT_ENABLED
    app.config["COMMENT_LIMIT_TIME_WINDOW"] = config.COMMENT_LIMIT_TIME_WINDOW
    app.config["COMMENT_LIMIT_MAX_COUNT"] = config.COMMENT_LIMIT_MAX_COUNT
    app.config["COMMENT_LIMIT_EXEMPT_ADMIN"] = config.COMMENT_LIMIT_EXEMPT_ADMIN
    
    # 数据库连接池配置
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_size": 10,
        "pool_recycle": 120,
        "pool_pre_ping": True,
        "max_overflow": 20,
    }

    # 启用 CORS - 修复跨域问题
    cors.init_app(app, 
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
                     "https://webbackend.handywote.site",
                     "https://www.handywote.top",
                     "https://handywote.top",
                     "http://www.handywote.top",
                     "http://handywote.top",
                     "https://webbackend.handywote.top"
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
    
    socketio_debug = os.environ.get("SOCKETIO_DEBUG", "").lower() in {"1", "true", "yes", "on"}
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        path='/socket.io/',
        logger=socketio_debug,
        engineio_logger=socketio_debug,
    )
    logger.info(f"SocketIO initialized with auto-selected async mode (debug={socketio_debug})")

    # 注册路由
    from routes import register_all_blueprints
    register_all_blueprints(app)

    # 确保上传目录存在 - 使用绝对路径
    upload_dir = os.path.abspath(app.config['UPLOAD_FOLDER'])
    os.makedirs(upload_dir, exist_ok=True, mode=0o755)
    logger.info(f"Upload directory ensured: {upload_dir}")
    
    # 确保上传目录有正确的权限
    try:
        os.chmod(upload_dir, 0o755)
        logger.info(f"Upload directory permissions set: {upload_dir}")
    except Exception as e:
        logger.warning(f"Failed to set upload directory permissions: {e}")
    
    # 验证上传目录是否可写
    try:
        test_file = os.path.join(upload_dir, 'test_write.tmp')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        logger.info(f"Upload directory is writable: {upload_dir}")
    except Exception as e:
        logger.error(f"Upload directory is not writable: {upload_dir}, error: {e}")

    # 添加健康检查路由
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': 'Flask app is running'}, 200

    # 添加路由映射查看路由（调试用）
    @app.route('/api/debug/routes')
    def debug_routes():
        """查看所有注册的路由"""
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'rule': rule.rule,
                'arguments': list(rule.arguments)
            })
        
        # 按照规则排序
        routes.sort(key=lambda x: x['rule'])
        
        return {
            'total_routes': len(routes),
            'routes': routes
        }

    @app.route('/robots.txt')
    def robots_txt():
        base_url = request.host_url.rstrip('/')
        content = [
            'User-agent: *',
            'Allow: /',
            f'Sitemap: {base_url}/sitemap.xml'
        ]
        response = make_response('\n'.join(content), 200)
        response.headers['Content-Type'] = 'text/plain'
        return response

    @app.route('/sitemap.xml')
    def sitemap_xml():
        base_url = request.host_url.rstrip('/')
        urls = [
            {'loc': f'{base_url}/', 'lastmod': datetime.utcnow().date().isoformat()},
            {'loc': f'{base_url}/articles', 'lastmod': datetime.utcnow().date().isoformat()}
        ]
        try:
            articles = Article.query.filter_by(deleted_at=None).order_by(Article.updated_at.desc()).all()
            for article in articles:
                lastmod = (article.updated_at or article.created_at or datetime.utcnow()).date().isoformat()
                urls.append({
                    'loc': f'{base_url}/articles/{article.id}',
                    'lastmod': lastmod
                })
        except Exception as exc:
            logger.warning(f'生成 sitemap 时读取文章失败: {exc}')

        xml_items = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        ]
        for item in urls:
            xml_items.append('  <url>')
            xml_items.append(f'    <loc>{item["loc"]}</loc>')
            if item.get('lastmod'):
                xml_items.append(f'    <lastmod>{item["lastmod"]}</lastmod>')
            xml_items.append('  </url>')
        xml_items.append('</urlset>')
        response = make_response('\n'.join(xml_items), 200)
        response.headers['Content-Type'] = 'application/xml'
        return response

    # 输出环境变量信息
    logger.info("Environment variables:")
    logger.info(f"  DB_HOST: {os.environ.get('DB_HOST', 'Not set')}")
    logger.info(f"  DB_PORT: {os.environ.get('DB_PORT', 'Not set')}")
    logger.info(f"  DB_NAME: {os.environ.get('DB_NAME', 'Not set')}")
    logger.info(f"  DB_USER: {os.environ.get('DB_USER', 'Not set')}")
    logger.info(f"  DB_PASSWORD: {'*' * len(os.environ.get('DB_PASSWORD', '')) if os.environ.get('DB_PASSWORD') else 'Not set'}")

    
    # 在应用上下文中初始化数据库
    with app.app_context():
        try:
            # 测试数据库连接 - 修复SQLAlchemy兼容性问题
            from sqlalchemy import text
            db.session.execute(text('SELECT 1'))
            logger.info("Database connection successful")
            
            # 创建表结构 - 修复SQLAlchemy兼容性问题
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

            # 首先尝试创建表结构
            db.create_all()
            app.logger.info("✅ 数据库表创建/检查完成")

            # 自动迁移：检查并添加PDF相关字段
            try:
                app.logger.info("开始检查PDF字段...")

                # 使用SQLAlchemy Inspector检查字段是否存在
                from sqlalchemy import inspect
                inspector = inspect(db.engine)
                columns = inspector.get_columns('article')
                column_names = [col['name'] for col in columns]

                # 检查并添加content_type字段
                if 'content_type' not in column_names:
                    with db.engine.connect() as conn:
                        conn.execute(db.text("""
                            ALTER TABLE article
                            ADD COLUMN content_type VARCHAR(16) DEFAULT 'markdown'
                        """))
                        conn.commit()
                    app.logger.info("✅ 添加content_type字段成功")
                else:
                    app.logger.info("✓ content_type字段已存在")

                # 检查并添加pdf_filename字段
                if 'pdf_filename' not in column_names:
                    with db.engine.connect() as conn:
                        conn.execute(db.text("""
                            ALTER TABLE article
                            ADD COLUMN pdf_filename VARCHAR(256)
                        """))
                        conn.commit()
                    app.logger.info("✅ 添加pdf_filename字段成功")
                else:
                    app.logger.info("✓ pdf_filename字段已存在")

                app.logger.info("✅ PDF字段检查完成")

            except Exception as e:
                app.logger.warning(f"PDF字段迁移失败: {e}")
                # 不中断初始化流程，继续执行
            
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

def setup_database():
    """设置数据库"""
    config = Config()
    
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
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

def initialize_environment():
    """初始化环境：创建.env文件和数据库"""
    logger.info("🎯 开始初始化环境...")
    logger.info("=" * 50)
    
    # 创建 .env 文件
    create_env_file()
    
    # 设置数据库
    logger.info("\n📊 设置数据库...")
    if not setup_database():
        logger.error("❌ 数据库设置失败，请检查 PostgreSQL 配置")
        return False
    
    logger.info("\n🎉 环境初始化完成！")
    logger.info("=" * 50)
    return True

# 创建应用实例
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

@socketio.on('connect', namespace='/comments')
def ws_comments_connect():
    logger.info('WebSocket /comments connected')
    socketio.emit('message', {'msg': 'comments ws connected'}, namespace='/comments')

@socketio.on('connect', namespace='/site_blocks')
def ws_site_blocks_connect():
    logger.info('WebSocket /site_blocks connected')
    socketio.emit('message', {'msg': 'site_blocks ws connected'}, namespace='/site_blocks')

if __name__ == '__main__':
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='启动网站后端服务')
    parser.add_argument('--init', action='store_true', help='初始化环境（创建.env文件和数据库）')
    parser.add_argument('--host', default='0.0.0.0', help='主机地址')
    parser.add_argument('--port', type=int, default=5000, help='端口号')
    parser.add_argument('--debug', action='store_true', help='调试模式')
    
    args = parser.parse_args()
    
    # 如果指定了初始化参数，则执行初始化
    if args.init:
        if not initialize_environment():
            sys.exit(1)
        print("\n💡 环境初始化完成，现在可以正常启动服务了。")
        sys.exit(0)
    
    # 启动服务
    try:
        logger.info("🚀 启动后端服务...")
        logger.info(f"📍 服务地址: http://{args.host}:{args.port}")
        logger.info("📚 API 文档: http://localhost:5000/api")
        logger.info("🔧 管理后台: http://localhost:5000/admin")
        logger.info("⏹️  按 Ctrl+C 停止服务")
        
        # 开发环境启动
        socketio.run(app, host=args.host, port=args.port, debug=args.debug)
    except Exception as e:
        logger.error(f"❌ 启动服务失败: {e}")

# 创建全局应用实例，供gunicorn使用
app = create_app()
