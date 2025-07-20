#!/usr/bin/env python3
"""
数据库初始化脚本
用于创建数据库表结构和插入示例数据
"""

import os
import sys
from datetime import datetime, timedelta
from app import app, db, Article, Comment

def init_database():
    """初始化数据库"""
    with app.app_context():
        # 创建所有表
        db.create_all()
        print("✅ 数据库表创建成功")

def insert_sample_data():
    """插入示例数据"""
    with app.app_context():
        # 检查是否已有数据
        if Article.query.first():
            print("⚠️  数据库中已有数据，跳过示例数据插入")
            return

        # 示例文章数据
        sample_articles = [
            {
                'title': 'React 18 新特性详解',
                'summary': '深入探讨 React 18 带来的并发特性、自动批处理、Suspense 改进等新功能，以及如何在实际项目中应用这些特性。',
                'content': '''# React 18 新特性详解

React 18 带来了许多激动人心的新特性，让我们一起来深入了解这些改进。

## 并发特性 (Concurrent Features)

React 18 最重要的改进就是引入了并发特性，这让我们能够：

- **并发渲染**: 同时准备多个版本的 UI
- **并发更新**: 中断和恢复渲染工作
- **并发模式**: 更好的用户体验

### 自动批处理 (Automatic Batching)

```javascript
// React 18 之前
setTimeout(() => {
  setCount(c => c + 1); // 触发重渲染
  setFlag(f => !f);     // 触发重渲染
}, 1000);

// React 18 之后
setTimeout(() => {
  setCount(c => c + 1); // 不会触发重渲染
  setFlag(f => !f);     // 不会触发重渲染
  // 两个更新会被批处理，只触发一次重渲染
}, 1000);
```

### Suspense 改进

React 18 改进了 Suspense 的功能：

```javascript
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <SomeComponent />
    </Suspense>
  );
}
```

## 新的 Hooks

### useTransition

```javascript
import { useTransition } from 'react';

function App() {
  const [isPending, startTransition] = useTransition();
  
  function handleClick() {
    startTransition(() => {
      setCount(c => c + 1);
    });
  }
  
  return (
    <div>
      {isPending && <Spinner />}
      <button onClick={handleClick}>更新</button>
    </div>
  );
}
```

### useDeferredValue

```javascript
import { useDeferredValue } from 'react';

function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  
  return (
    <ul>
      {search(deferredQuery).map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

## 实际应用建议

1. **渐进式升级**: 可以逐步启用新特性
2. **性能监控**: 使用 React DevTools 监控性能
3. **测试覆盖**: 确保新特性不影响现有功能

React 18 的这些改进让我们能够构建更流畅、更响应的用户界面。''',
                'category': '前端开发',
                'tags': ['React', 'JavaScript', '前端', '并发'],
                'cover_image': None
            },
            {
                'title': 'Python Flask 最佳实践',
                'summary': '分享在 Flask 开发中的最佳实践，包括项目结构、配置管理、数据库操作、API 设计等方面的经验总结。',
                'content': '''# Python Flask 最佳实践

Flask 是一个轻量级的 Python Web 框架，但在实际项目中，我们需要遵循一些最佳实践来确保代码的可维护性和可扩展性。

## 项目结构

推荐的项目结构：

```
myapp/
├── app/
│   ├── __init__.py
│   ├── models/
│   ├── views/
│   ├── templates/
│   └── static/
├── config.py
├── requirements.txt
└── run.py
```

## 配置管理

使用工厂模式创建应用：

```python
# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import config

db = SQLAlchemy()

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    db.init_app(app)
    
    return app
```

```python
# config.py
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'hard-to-guess-string'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///dev.db'

class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
```

## 数据库操作

### 模型定义

```python
# app/models/user.py
from app import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, index=True)
    email = db.Column(db.String(120), unique=True, index=True)
    password_hash = db.Column(db.String(128))
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
```

### 数据库迁移

使用 Flask-Migrate 管理数据库迁移：

```python
from flask_migrate import Migrate
from app import create_app, db

app = create_app('development')
migrate = Migrate(app, db)
```

## API 设计

### RESTful API

```python
# app/views/api.py
from flask import Blueprint, jsonify, request
from app.models.user import User

api = Blueprint('api', __name__)

@api.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@api.route('/users/<int:id>', methods=['GET'])
def get_user(id):
    user = User.query.get_or_404(id)
    return jsonify(user.to_dict())

@api.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    user = User(**data)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201
```

### 错误处理

```python
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500
```

## 安全性

### 输入验证

```python
from marshmallow import Schema, fields, validate

class UserSchema(Schema):
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6))

user_schema = UserSchema()
```

### CORS 处理

```python
from flask_cors import CORS

app = create_app('development')
CORS(app)
```

## 性能优化

### 数据库查询优化

```python
# 使用 join 减少查询次数
users = User.query.join(Post).filter(Post.published == True).all()

# 使用 lazy loading
users = User.query.options(db.joinedload('posts')).all()
```

### 缓存

```python
from flask_caching import Cache

cache = Cache()

@cache.memoize(timeout=300)
def get_user_posts(user_id):
    return Post.query.filter_by(user_id=user_id).all()
```

## 测试

```python
import unittest
from app import create_app, db
from app.models.user import User

class TestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
    
    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_user_creation(self):
        user = User(username='test', email='test@example.com')
        user.set_password('password')
        db.session.add(user)
        db.session.commit()
        
        self.assertIsNotNone(User.query.filter_by(username='test').first())
```

遵循这些最佳实践，可以让你的 Flask 项目更加健壮和可维护。''',
                'category': '后端开发',
                'tags': ['Python', 'Flask', '后端', 'API'],
                'cover_image': None
            },
            {
                'title': '现代 CSS 布局技术',
                'summary': '介绍现代 CSS 布局技术，包括 Flexbox、Grid、CSS Container Queries 等，以及如何在实际项目中灵活运用这些技术。',
                'content': '''# 现代 CSS 布局技术

CSS 布局技术在过去几年中有了巨大的发展，从传统的 float 布局到现代的 Flexbox 和 Grid，再到最新的 Container Queries，让我们一起来了解这些强大的布局技术。

## Flexbox 布局

Flexbox 是最常用的现代布局技术之一，特别适合一维布局。

### 基本概念

```css
.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}
```

### 常用属性

```css
/* 主轴对齐 */
justify-content: flex-start | flex-end | center | space-between | space-around | space-evenly;

/* 交叉轴对齐 */
align-items: stretch | flex-start | flex-end | center | baseline;

/* 换行 */
flex-wrap: nowrap | wrap | wrap-reverse;

/* 多行对齐 */
align-content: flex-start | flex-end | center | space-between | space-around | stretch;
```

### 实际应用

```css
/* 导航栏 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}

/* 卡片布局 */
.card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.card {
  flex: 1 1 300px;
  min-width: 0;
}
```

## CSS Grid 布局

Grid 是二维布局的强大工具，适合复杂的页面布局。

### 基本设置

```css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 1rem;
}
```

### 网格区域

```css
.container {
  display: grid;
  grid-template-areas: 
    "header header header"
    "sidebar main aside"
    "footer footer footer";
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.aside { grid-area: aside; }
.footer { grid-area: footer; }
```

### 响应式网格

```css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}
```

## CSS Container Queries

Container Queries 是最新的布局技术，允许根据容器大小而不是视口大小来应用样式。

### 基本用法

```css
.card-container {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}
```

### 实际应用

```css
.product-grid {
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.product-card {
  display: flex;
  flex-direction: column;
}

@container (min-width: 300px) {
  .product-card {
    flex-direction: row;
  }
  
  .product-image {
    width: 120px;
    height: 120px;
  }
}
```

## 现代布局模式

### 圣杯布局 (Holy Grail)

```css
.holy-grail {
  display: grid;
  grid-template: 
    "header header header" auto
    "nav main aside" 1fr
    "footer footer footer" auto
    / 200px 1fr 200px;
  min-height: 100vh;
}

.header { grid-area: header; }
.nav { grid-area: nav; }
.main { grid-area: main; }
.aside { grid-area: aside; }
.footer { grid-area: footer; }

@media (max-width: 768px) {
  .holy-grail {
    grid-template: 
      "header" auto
      "nav" auto
      "main" 1fr
      "aside" auto
      "footer" auto
      / 1fr;
  }
}
```

### 卡片布局

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

.card {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: transform 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
}

.card-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.card-content {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.card-description {
  color: #666;
  flex: 1;
}

.card-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}
```

## 性能优化

### 使用 CSS 变量

```css
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --spacing-unit: 1rem;
  --border-radius: 4px;
}

.button {
  background-color: var(--primary-color);
  padding: var(--spacing-unit);
  border-radius: var(--border-radius);
}
```

### 避免重排重绘

```css
/* 使用 transform 而不是改变位置 */
.animated-element {
  transform: translateX(100px);
  /* 而不是 left: 100px; */
}

/* 使用 will-change 提示浏览器 */
.optimized-animation {
  will-change: transform;
}
```

## 浏览器支持

- Flexbox: 所有现代浏览器都支持
- Grid: IE 11+ 支持（需要前缀）
- Container Queries: 现代浏览器支持（Chrome 105+, Firefox 110+）

现代 CSS 布局技术让我们能够创建更加灵活和响应式的布局，同时保持代码的简洁性和可维护性。''',
                'category': '前端开发',
                'tags': ['CSS', '布局', 'Flexbox', 'Grid'],
                'cover_image': None
            }
        ]

        # 插入文章
        for article_data in sample_articles:
            article = Article(**article_data)
            db.session.add(article)
        
        db.session.commit()
        print("✅ 示例文章插入成功")

        # 为第一篇文章添加示例评论
        first_article = Article.query.first()
        if first_article:
            sample_comments = [
                {
                    'author': '张三',
                    'content': '这篇文章写得很好，对 React 18 的新特性讲解得很清楚！'
                },
                {
                    'author': '李四',
                    'content': '请问自动批处理在什么情况下会失效？'
                },
                {
                    'author': '王五',
                    'content': '感谢分享，这些新特性确实很实用。'
                }
            ]

            for comment_data in sample_comments:
                comment = Comment(
                    article_id=first_article.id,
                    **comment_data
                )
                db.session.add(comment)
            
            db.session.commit()
            print("✅ 示例评论插入成功")

def main():
    """主函数"""
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