from extensions import db
from datetime import datetime

class RecycleBin(db.Model):
    __tablename__ = 'recycle_bin'
    id = db.Column(db.Integer, primary_key=True)
    data_type = db.Column(db.String(32), nullable=False)  # skill/article/contact/avatar等
    data_id = db.Column(db.Integer, nullable=False)
    data_json = db.Column(db.JSON, nullable=False)
    deleted_at = db.Column(db.DateTime, default=datetime.utcnow) 