from functools import wraps
from flask import request
from flask_jwt_extended import get_jwt_identity

def log_action(action, target=None):
    """
    简化的日志记录装饰器
    暂时移除数据库日志记录功能，只保留装饰器结构
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # 执行原函数
            result = fn(*args, **kwargs)
            
            # 暂时移除数据库日志记录，避免导入错误
            # TODO: 如果需要日志记录功能，可以后续添加
            try:
                operator = get_jwt_identity() or 'anonymous'
                ip = request.remote_addr
                user_agent = request.headers.get('User-Agent', '')
                detail = str(request.json) if request.is_json else ''
                
                # 这里可以添加简单的日志记录，比如打印到控制台
                print(f"Action: {action}, Operator: {operator}, IP: {ip}")
                
            except Exception as e:
                # 静默处理异常，不影响主要功能
                pass
            
            return result
        return wrapper
    return decorator
