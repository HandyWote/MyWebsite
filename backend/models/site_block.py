from extensions import db
from datetime import datetime

class SiteBlock(db.Model):
    __tablename__ = 'site_block'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(32), unique=True, nullable=False)  # home/about/skills/contact
    content = db.Column(db.JSON, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow) 