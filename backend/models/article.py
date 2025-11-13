from extensions import db
from datetime import datetime

class Article(db.Model):
    __tablename__ = 'article'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(128), nullable=False)
    category = db.Column(db.String(64))
    tags = db.Column(db.String(256))  # 逗号分隔
    cover = db.Column(db.String(256))
    summary = db.Column(db.Text)
    content = db.Column(db.Text)
    content_type = db.Column(db.String(16), default='markdown')  # 'markdown' or 'pdf'
    pdf_filename = db.Column(db.String(256))  # PDF文件名（当content_type='pdf'时使用）
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    deleted_at = db.Column(db.DateTime) 