from flask import Flask
from config import Config
from extensions import db, jwt, scheduler
from routes import register_all_blueprints
import os
from services.recycle_bin import clear_expired_recycle_bin


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 