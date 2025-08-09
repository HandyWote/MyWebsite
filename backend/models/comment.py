from extensions import db
from datetime import datetime
from models.article import Article

class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('articles.id'), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=True)  # 可选邮箱
    content = db.Column(db.Text, nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)  # 记录IP地址
    user_agent = db.Column(db.Text, nullable=True)  # 记录用户代理
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系定义
    article = db.relationship('Article', backref=db.backref('comments', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'article_id': self.article_id,
            'author': self.author,
            'email': self.email,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
