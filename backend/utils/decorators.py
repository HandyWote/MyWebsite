from functools import wraps
from flask import request, g
from extensions import db
from models.log import Log
from flask_jwt_extended import get_jwt_identity

def log_action(action, target=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            result = fn(*args, **kwargs)
            try:
                operator = get_jwt_identity() or 'anonymous'
                ip = request.remote_addr
                user_agent = request.headers.get('User-Agent', '')
                detail = str(request.json) if request.is_json else ''
                log = Log(operator=operator, action=action, target=target, detail=detail, ip=ip, user_agent=user_agent)
                db.session.add(log)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
            return result
        return wrapper
    return decorator 