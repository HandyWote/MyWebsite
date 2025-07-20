from extensions import db
from datetime import datetime

class Avatar(db.Model):
    __tablename__ = 'avatar'
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(256), nullable=False)
    is_current = db.Column(db.Boolean, default=False)
    cropped_info = db.Column(db.JSON)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    deleted_at = db.Column(db.DateTime) 