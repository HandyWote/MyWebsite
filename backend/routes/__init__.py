from .auth import auth_bp
from .site_block import site_block_bp
from .skill import skill_bp
from .contact import contact_bp
from .article import article_bp
from .avatar import avatar_bp
from .log import log_bp
from .recycle_bin import recycle_bin_bp
from .export_import import export_import_bp
from .public import public_bp

def register_all_blueprints(app):
    # 公开 API 路由（前端使用）
    app.register_blueprint(public_bp, url_prefix='/api')
    
    # 管理后台 API 路由
    app.register_blueprint(auth_bp, url_prefix='/api/admin')
    app.register_blueprint(site_block_bp, url_prefix='/api/admin')
    app.register_blueprint(skill_bp, url_prefix='/api/admin')
    app.register_blueprint(contact_bp, url_prefix='/api/admin')
    app.register_blueprint(article_bp, url_prefix='/api/admin')
    app.register_blueprint(avatar_bp, url_prefix='/api/admin')
    app.register_blueprint(log_bp, url_prefix='/api/admin')
    app.register_blueprint(recycle_bin_bp, url_prefix='/api/admin')
    app.register_blueprint(export_import_bp, url_prefix='/api/admin') 