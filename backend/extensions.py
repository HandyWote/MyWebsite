from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_apscheduler import APScheduler
from flask_socketio import SocketIO

# 全局扩展对象

db = SQLAlchemy()
jwt = JWTManager()
scheduler = APScheduler()
socketio = SocketIO() 