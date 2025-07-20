from extensions import db
from datetime import datetime

class Log(db.Model):
    __tablename__ = 'log'
    id = db.Column(db.Integer, primary_key=True)
    operator = db.Column(db.String(64), nullable=False)
    action = db.Column(db.String(64), nullable=False)
    target = db.Column(db.String(64))
    detail = db.Column(db.Text)
    ip = db.Column(db.String(64))
    user_agent = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow) 