#!/usr/bin/env python3
"""
数据库初始化脚本
用于创建数据库表结构和插入示例数据
"""
import sys
from app import app
from extensions import db
from models.site_block import SiteBlock
from models.skill import Skill
from models.contact import Contact
from models.article import Article
from models.avatar import Avatar
from models.log import Log
from models.recycle_bin import RecycleBin
from datetime import datetime

def init_database():
    """初始化数据库"""
    with app.app_context():
        db.create_all()
        print("✅ 数据库表创建成功")

def insert_sample_data():
    """插入示例数据"""
    with app.app_context():
        # 示例分块内容
        if not SiteBlock.query.first():
            blocks = [
                SiteBlock(name='home', content={"title": "HandyWote", "desc": "少年侠气交结五都雄！"}),
                SiteBlock(name='about', content={"desc": "汕头大学 | 黄应辉"}),
                SiteBlock(name='skills', content={}),
                SiteBlock(name='contact', content={}),
            ]
            db.session.add_all(blocks)
            db.session.commit()
            print("✅ 示例分块内容插入成功")
        # 示例技能
        if not Skill.query.first():
            skills = [
                Skill(name='Python', description='熟练掌握 Python 编程', level=90),
                Skill(name='React', description='熟悉 React 前端开发', level=85),
            ]
            db.session.add_all(skills)
            db.session.commit()
            print("✅ 示例技能插入成功")
        # 示例联系方式
        if not Contact.query.first():
            contacts = [
                Contact(type='email', value='handywote@example.com'),
                Contact(type='wechat', value='handywote123'),
            ]
            db.session.add_all(contacts)
            db.session.commit()
            print("✅ 示例联系方式插入成功")
        # 示例文章
        if not Article.query.first():
            article = Article(
                title='Hello World',
                category='前端开发',
                tags='React,JavaScript',
                cover='',
                summary='这是一篇示例文章',
                content='# Hello World\n欢迎使用管理后台！'
            )
            db.session.add(article)
            db.session.commit()
            print("✅ 示例文章插入成功")

def main():
    print("🚀 开始初始化数据库...")
    try:
        init_database()
        insert_sample_data()
        print("🎉 数据库初始化完成！")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 