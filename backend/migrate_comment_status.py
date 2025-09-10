#!/usr/bin/env python3
"""
数据库迁移脚本：为评论表添加status字段
"""

import os
import sys
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from extensions import db
from models.comment import Comment

def migrate_comment_status():
    """为评论表添加status字段"""
    
    # 创建临时Flask应用
    app = Flask(__name__)
    
    # 加载环境变量
    from dotenv import load_dotenv
    load_dotenv()
    
    # 从config.py获取数据库配置
    from config import Config
    config = Config()
    
    # 配置数据库
    app.config['SQLALCHEMY_DATABASE_URI'] = config.SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 初始化数据库
    db.init_app(app)
    
    with app.app_context():
        try:
            # 检查status字段是否已存在
            inspector = db.inspect(db.engine)
            columns = inspector.get_columns('comments')
            status_column_exists = any(col['name'] == 'status' for col in columns)
            
            if status_column_exists:
                print("status字段已存在，无需迁移")
                return
            
            # 添加status字段
            with db.engine.connect() as conn:
                conn.execute(db.text("""
                    ALTER TABLE comments 
                    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'normal'
                """))
                conn.commit()
            
            print("✅ 成功为comments表添加status字段")
            
        except Exception as e:
            print(f"❌ 迁移失败: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    migrate_comment_status()