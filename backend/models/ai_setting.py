from datetime import datetime
from extensions import db


class AISetting(db.Model):
    __tablename__ = 'ai_settings'

    id = db.Column(db.Integer, primary_key=True)
    prompt = db.Column(db.Text, default='')
    model = db.Column(db.String(128), default='')
    base_url = db.Column(db.String(255), default='')
    api_key = db.Column(db.String(255), default='')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'prompt': self.prompt or '',
            'model': self.model or '',
            'base_url': self.base_url or '',
            'has_api_key': bool(self.api_key)
        }
