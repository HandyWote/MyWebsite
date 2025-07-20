from extensions import db
from models.recycle_bin import RecycleBin
from datetime import datetime, timedelta

def clear_expired_recycle_bin(days=15):
    expire_time = datetime.utcnow() - timedelta(days=days)
    expired_items = RecycleBin.query.filter(RecycleBin.deleted_at < expire_time).all()
    for item in expired_items:
        db.session.delete(item)
    db.session.commit() 