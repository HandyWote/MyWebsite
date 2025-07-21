from flask import Flask
from flask_cors import CORS
from setup import Config
from extensions import db, jwt, scheduler
from routes import register_all_blueprints
import os
from services.recycle_bin import clear_expired_recycle_bin
from flask_socketio import SocketIO, emit


def create_app():
    app = Flask(__name__)
    config = Config()
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
    # 其它配置项如有需要可继续添加

    # 启用 CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # 初始化扩展
    db.init_app(app)
    jwt.init_app(app)
    scheduler.init_app(app)

    # 注册定时任务：每天凌晨2点清理回收站
    @scheduler.task('cron', id='clear_recycle_bin', hour=2)
    def scheduled_clear_recycle_bin():
        with app.app_context():
            clear_expired_recycle_bin(days=15)

    scheduler.start()

    # 注册所有蓝图
    register_all_blueprints(app)

    # 确保上传目录存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    return app


app = create_app()
socketio = SocketIO(app, cors_allowed_origins="*")

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
    import eventlet
    import eventlet.wsgi
    import eventlet.green.select  # 关键：确保 select 被打补丁
    eventlet.monkey_patch()       # 关键：确保所有标准库被打补丁
    socketio.run(app, host='0.0.0.0', port=5000, debug=True) 