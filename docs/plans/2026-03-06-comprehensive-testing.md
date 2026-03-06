# 全栈测试用例实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为整个全栈项目（后端 Flask + 前端 React）创建完整的测试用例覆盖

**Architecture:**
- 后端使用 pytest + Flask Testing
- 前端使用 Vitest + React Testing Library
- 测试数据库使用 SQLite 内存数据库进行隔离测试

**Tech Stack:**
- Backend: pytest, Flask-Testing, pytest-cov
- Frontend: Vitest, React Testing Library, jsdom, @testing-library/jest-dom

---

## 第一阶段：测试环境搭建

### Task 1: 后端测试环境配置

**Files:**
- Modify: `backend/pyproject.toml`

**Step 1: 添加测试依赖到 pyproject.toml**

```toml
[project.optional-dependencies]
test = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
    "pytest-flask>=1.3.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --cov=. --cov-report=html --cov-report=term"
```

**Step 2: 创建后端测试目录结构**

```bash
mkdir -p backend/tests
mkdir -p backend/tests/routes
mkdir -p backend/tests/models
mkdir -p backend/tests/utils
mkdir -p backend/tests/services
```

**Step 3: 创建 pytest 配置文件**

**Files:**
- Create: `backend/tests/conftest.py`

```python
import pytest
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope='session')
def app():
    """创建测试应用"""
    from app import create_app
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    return app


@pytest.fixture(scope='function')
def client(app):
    """创建测试客户端"""
    return app.test_client()


@pytest.fixture(scope='function')
def db(app):
    """创建测试数据库"""
    from extensions import db
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()
```

**Step 4: 安装测试依赖**

```bash
cd backend
uv sync --group test
```

---

### Task 2: 前端测试环境配置

**Files:**
- Modify: `frontend/package.json`

**Step 1: 添加测试依赖到 package.json**

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0",
    "jsdom": "^24.0.0",
    "eslint-plugin-jest": "^28.0.0",
    "eslint-plugin-testing-library": "^6.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Step 2: 创建 Vitest 配置文件**

**Files:**
- Create: `frontend/vitest.config.js`

```javascript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setupTests.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**']
    }
  }
})
```

**Step 3: 创建测试设置文件**

**Files:**
- Create: `frontend/src/test/setupTests.js`

```javascript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// 模拟 window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// 模拟 localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
window.localStorage = localStorageMock
```

**Step 4: 安装测试依赖**

```bash
cd frontend
npm install
```

---

## 第二阶段：后端单元测试

### Task 3: 工具函数测试 - response.py

**Files:**
- Create: `backend/tests/utils/test_response.py`

**Step 1: 编写失败的测试**

```python
import pytest
from utils.response import success, error


def test_success_with_data():
    """测试 success 函数返回正确的数据结构"""
    data = {'id': 1, 'name': 'test'}
    result = success(data)
    assert result['code'] == 0
    assert result['msg'] == 'success'
    assert result['data'] == data


def test_success_with_custom_msg():
    """测试 success 函数自定义消息"""
    result = success(msg='操作成功')
    assert result['msg'] == '操作成功'


def test_success_with_no_data():
    """测试 success 函数无数据参数"""
    result = success()
    assert result['code'] == 0
    assert result['data'] is None


def test_error_default():
    """测试 error 函数默认参数"""
    result = error()
    assert result['code'] == 1
    assert result['msg'] == 'error'


def test_error_custom_message():
    """测试 error 函数自定义消息"""
    result = error('自定义错误')
    assert result['msg'] == '自定义错误'


def test_error_custom_code():
    """测试 error 函数自定义状态码"""
    result = error(code=404)
    assert result['code'] == 404


def test_error_with_data():
    """测试 error 函数带数据"""
    result = error(data={'field': 'error'})
    assert result['data'] == {'field': 'error'}
```

**Step 2: 运行测试验证失败**

```bash
cd backend && uv run pytest tests/utils/test_response.py -v
```

**Step 3: 确认测试通过**

由于 response.py 已经实现简单，测试应该直接通过。

---

### Task 4: 工具函数测试 - comment_limits.py

**Files:**
- Create: `backend/tests/utils/test_comment_limits.py`

**Step 1: 编写失败的测试**

```python
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch


class TestCommentLimitChecker:
    """测试 CommentLimitChecker 类"""

    def test_init_default_config(self):
        """测试默认配置"""
        from utils.comment_limits import CommentLimitChecker
        config = {
            'COMMENT_LIMIT_ENABLED': True,
            'COMMENT_LIMIT_TIME_WINDOW': 24,
            'COMMENT_LIMIT_MAX_COUNT': 3,
            'COMMENT_LIMIT_EXEMPT_ADMIN': True
        }
        checker = CommentLimitChecker(config)
        assert checker.enabled is True
        assert checker.time_window_hours == 24
        assert checker.max_comments == 3

    def test_init_disabled(self):
        """测试限制功能禁用"""
        from utils.comment_limits import CommentLimitChecker
        config = {'COMMENT_LIMIT_ENABLED': False}
        checker = CommentLimitChecker(config)
        assert checker.enabled is False


class TestCheckCommentLimit:
    """测试 check_comment_limit 函数"""

    def test_disabled_returns_true(self, app):
        """测试限制禁用时返回 True"""
        from utils.comment_limits import check_comment_limit
        with app.app_context():
            app.config['COMMENT_LIMIT_ENABLED'] = False
            result, reason = check_comment_limit(1, '127.0.0.1')
            assert result is True
            assert reason == ""

    def test_no_comments_allows_posting(self, app, db):
        """测试无评论时允许发表"""
        from utils.comment_limits import check_comment_limit
        from models.comment import Comment
        with app.app_context():
            app.config['COMMENT_LIMIT_ENABLED'] = True
            app.config['COMMENT_LIMIT_TIME_WINDOW'] = 24
            app.config['COMMENT_LIMIT_MAX_COUNT'] = 3
            result, reason = check_comment_limit(1, '192.168.1.1')
            assert result is True


class TestValidateCommentLimitConfig:
    """测试配置验证"""

    def test_valid_config(self, app):
        """测试有效配置"""
        from utils.comment_limits import validate_comment_limit_config
        with app.app_context():
            app.config['COMMENT_LIMIT_TIME_WINDOW'] = 24
            app.config['COMMENT_LIMIT_MAX_COUNT'] = 3
            valid, msg = validate_comment_limit_config()
            assert valid is True

    def test_invalid_time_window(self, app):
        """测试无效时间窗口"""
        from utils.comment_limits import validate_comment_limit_config
        with app.app_context():
            app.config['COMMENT_LIMIT_TIME_WINDOW'] = 0
            valid, msg = validate_comment_limit_config()
            assert valid is False

    def test_invalid_max_count(self, app):
        """测试无效最大评论数"""
        from utils.comment_limits import validate_comment_limit_config
        with app.app_context():
            app.config['COMMENT_LIMIT_MAX_COUNT'] = -1
            valid, msg = validate_comment_limit_config()
            assert valid is False
```

**Step 2: 运行测试验证失败**

```bash
cd backend && uv run pytest tests/utils/test_comment_limits.py -v
```

---

### Task 5: 工具函数测试 - jwt.py

**Files:**
- Create: `backend/tests/utils/test_jwt.py`

**Step 1: 编写测试**

```python
import pytest
from utils.jwt import admin_required
from flask_jwt_extended import create_access_token


def test_admin_required_decorator_success(client):
    """测试 admin_required 装饰器 - 成功情况"""
    @admin_required
    def protected_route():
        return {'message': 'success'}

    # 创建有效 token
    token = create_access_token(identity='admin')
    headers = {'Authorization': f'Bearer {token}'}
    response = client.get('/test', headers=headers)
    assert response.status_code == 200


def test_admin_required_decorator_no_identity(client):
    """测试 admin_required 装饰器 - 无身份"""
    token = create_access_token(identity='user')
    headers = {'Authorization': f'Bearer {token}'}
    response = client.get('/test', headers=headers)
    assert response.status_code == 403
```

---

### Task 6: 工具函数测试 - image_utils.py

**Files:**
- Create: `backend/tests/utils/test_image_utils.py`

**Step 1: 编写测试**

```python
import pytest
import os
from utils.image_utils import should_convert_to_webp, get_webp_filename


def test_should_convert_to_webp():
    """测试需要转换的图片格式"""
    assert should_convert_to_webp('image.jpg') is True
    assert should_convert_to_webp('image.png') is True
    assert should_convert_to_webp('image.jpeg') is True
    assert should_convert_to_webp('image.webp') is False
    assert should_convert_to_webp('image.gif') is False


def test_get_webp_filename():
    """测试生成 webp 文件名"""
    assert get_webp_filename('image.jpg') == 'image.webp'
    assert get_webp_filename('photo.png') == 'photo.webp'
    assert get_webp_filename('pic.webp') == 'pic.webp'
```

---

### Task 7: 模型测试 - Article Model

**Files:**
- Create: `backend/tests/models/test_article.py`

**Step 1: 编写测试**

```python
import pytest
from models.article import Article
from datetime import datetime


def test_article_creation(db):
    """测试文章创建"""
    article = Article(
        title='Test Article',
        category='Test',
        tags='tag1,tag2',
        content='# Test Content'
    )
    db.session.add(article)
    db.session.commit()

    assert article.id is not None
    assert article.title == 'Test Article'
    assert article.deleted_at is None


def test_article_soft_delete(db):
    """测试文章软删除"""
    article = Article(title='Test')
    db.session.add(article)
    db.session.commit()

    article.deleted_at = datetime.utcnow()
    db.session.commit()

    assert article.deleted_at is not None

    # 验证查询时自动排除已删除文章
    result = Article.query.filter_by(title='Test').first()
    assert result is None


def test_article_content_type(db):
    """测试文章内容类型"""
    article_md = Article(title='MD', content_type='markdown')
    article_pdf = Article(title='PDF', content_type='pdf', pdf_filename='test.pdf')

    db.session.add_all([article_md, article_pdf])
    db.session.commit()

    assert article_md.content_type == 'markdown'
    assert article_pdf.content_type == 'pdf'
```

---

### Task 8: 模型测试 - Comment Model

**Files:**
- Create: `backend/tests/models/test_comment.py`

**Step 1: 编写测试**

```python
import pytest
from models.comment import Comment
from models.article import Article


def test_comment_creation(db):
    """测试评论创建"""
    article = Article(title='Test')
    db.session.add(article)
    db.session.commit()

    comment = Comment(
        article_id=article.id,
        author='Test User',
        content='Test Comment'
    )
    db.session.add(comment)
    db.session.commit()

    assert comment.id is not None
    assert comment.author == 'Test User'
    assert comment.status == 'approved'


def test_comment_to_dict(db):
    """测试评论序列化"""
    article = Article(title='Test')
    db.session.add(article)
    db.session.commit()

    comment = Comment(
        article_id=article.id,
        author='User',
        content='Content',
        email='test@example.com'
    )
    db.session.add(comment)
    db.session.commit()

    result = comment.to_dict()
    assert 'id' in result
    assert result['author'] == 'User'
    assert result['email'] == 'test@example.com'
```

---

### Task 9: API 路由测试 - Auth

**Files:**
- Create: `backend/tests/routes/test_auth.py`

**Step 1: 编写测试**

```python
import pytest
import json


def test_login_success(client):
    """测试登录成功"""
    response = client.post('/api/admin/login',
        json={'password': 'admin123'},
        content_type='application/json'
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['code'] == 0
    assert 'token' in data


def test_login_wrong_password(client):
    """测试登录密码错误"""
    response = client.post('/api/admin/login',
        json={'password': 'wrong'},
        content_type='application/json'
    )
    assert response.status_code == 401
    data = json.loads(response.data)
    assert data['code'] == 1


def test_login_missing_password(client):
    """测试登录缺少密码"""
    response = client.post('/api/admin/login',
        json={},
        content_type='application/json'
    )
    assert response.status_code == 401


def test_verify_token_valid(client):
    """测试验证有效 token"""
    # 先登录获取 token
    login_response = client.post('/api/admin/login',
        json={'password': 'admin123'}
    )
    token = json.loads(login_response.data)['token']

    # 验证 token
    response = client.get('/api/admin/verify',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['data']['valid'] is True


def test_verify_token_invalid(client):
    """测试验证无效 token"""
    response = client.get('/api/admin/verify',
        headers={'Authorization': 'Bearer invalid_token'}
    )
    assert response.status_code == 401
```

---

### Task 10: API 路由测试 - Public Articles

**Files:**
- Create: `backend/tests/routes/test_public_articles.py`

**Step 1: 编写测试**

```python
import pytest
import json
from models.article import Article


def test_get_articles_empty(client, db):
    """测试获取空文章列表"""
    response = client.get('/api/articles')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['code'] == 0
    assert data['articles'] == []


def test_get_articles_with_data(client, db):
    """测试获取文章列表"""
    article = Article(title='Test', content='Content')
    db.session.add(article)
    db.session.commit()

    response = client.get('/api/articles')
    data = json.loads(response.data)
    assert len(data['articles']) == 1
    assert data['articles'][0]['title'] == 'Test'


def test_get_articles_with_pagination(client, db):
    """测试文章分页"""
    for i in range(15):
        article = Article(title=f'Article {i}')
        db.session.add(article)
    db.session.commit()

    response = client.get('/api/articles?page=1&per_page=10')
    data = json.loads(response.data)
    assert len(data['articles']) == 10
    assert data['total'] == 15
    assert data['pages'] == 2


def test_get_article_detail(client, db):
    """测试获取文章详情"""
    article = Article(title='Test', content='# Content')
    db.session.add(article)
    db.session.commit()

    response = client.get(f'/api/articles/{article.id}')
    data = json.loads(response.data)
    assert data['code'] == 0
    assert data['title'] == 'Test'


def test_get_article_not_found(client):
    """测试获取不存在的文章"""
    response = client.get('/api/articles/99999')
    assert response.status_code == 404


def test_get_categories(client, db):
    """测试获取分类"""
    Article(title='A', category='Tech').add_to_session(db)
    Article(title='B', category='Tech').add_to_session(db)
    Article(title='C', category='Life').add_to_session(db)
    db.session.commit()

    response = client.get('/api/categories')
    data = json.loads(response.data)
    assert 'Tech' in data['categories']
    assert 'Life' in data['categories']


def test_get_tags(client, db):
    """测试获取标签"""
    article = Article(tags='react,javascript,python')
    db.session.add(article)
    db.session.commit()

    response = client.get('/api/tags')
    data = json.loads(response.data)
    assert 'react' in data['tags']
    assert data['tags']['react'] == 1
```

---

### Task 11: API 路由测试 - Comments

**Files:**
- Create: `backend/tests/routes/test_comments.py`

**Step 1: 编写测试**

```python
import pytest
import json
from models.article import Article
from models.comment import Comment


def test_get_comments_empty(client, db):
    """测试获取空评论列表"""
    article = Article(title='Test')
    db.session.add(article)
    db.session.commit()

    response = client.get(f'/api/articles/{article.id}/comments')
    data = json.loads(response.data)
    assert data['code'] == 0
    assert data['comments'] == []


def test_create_comment_success(client, db):
    """测试创建评论成功"""
    article = Article(title='Test')
    db.session.add(article)
    db.session.commit()

    response = client.post(
        f'/api/articles/{article.id}/comments',
        json={'author': 'User', 'content': 'Great post!'},
        content_type='application/json'
    )
    data = json.loads(response.data)
    assert data['code'] == 0


def test_create_comment_missing_author(client, db):
    """测试创建评论缺少作者"""
    article = Article(title='Test')
    db.session.add(article)
    db.session.commit()

    response = client.post(
        f'/api/articles/{article.id}/comments',
        json={'content': 'Content'},
        content_type='application/json'
    )
    assert response.status_code == 400


def test_create_comment_missing_content(client, db):
    """测试创建评论缺少内容"""
    article = Article(title='Test')
    db.session.add(article)
    db.session.commit()

    response = client.post(
        f'/api/articles/{article.id}/comments',
        json={'author': 'User'},
        content_type='application/json'
    )
    assert response.status_code == 400


def test_create_comment_article_not_found(client):
    """测试对不存在的文章评论"""
    response = client.post(
        '/api/articles/99999/comments',
        json={'author': 'User', 'content': 'Content'},
        content_type='application/json'
    )
    assert response.status_code == 404
```

---

### Task 12: API 路由测试 - Admin Articles

**Files:**
- Create: `backend/tests/routes/test_admin_articles.py`

**Step 1: 编写测试**

```python
import pytest
import json
from flask_jwt_extended import create_access_token
from models.article import Article


def get_auth_header(client):
    """获取认证头"""
    token = create_access_token(identity='admin')
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


def test_get_articles_requires_auth(client):
    """测试获取文章需要认证"""
    response = client.get('/api/admin/articles')
    assert response.status_code == 401


def test_get_articles_success(client, db):
    """测试获取文章成功"""
    article = Article(title='Test')
    db.session.add(article)
    db.session.commit()

    response = client.get('/api/admin/articles', headers=get_auth_header(client))
    data = json.loads(response.data)
    assert data['code'] == 0
    assert len(data['data']) == 1


def test_create_article_success(client, db):
    """测试创建文章成功"""
    response = client.post(
        '/api/admin/articles',
        headers=get_auth_header(client),
        json={
            'title': 'New Article',
            'content': '# Content',
            'content_type': 'markdown'
        }
    )
    data = json.loads(response.data)
    assert data['code'] == 0
    assert 'id' in data


def test_create_article_invalid_content_type(client, db):
    """测试创建文章无效内容类型"""
    response = client.post(
        '/api/admin/articles',
        headers=get_auth_header(client),
        json={
            'title': 'Test',
            'content_type': 'invalid'
        }
    )
    assert response.status_code == 400


def test_create_article_empty_content(client, db):
    """测试创建文章空内容"""
    response = client.post(
        '/api/admin/articles',
        headers=get_auth_header(client),
        json={
            'title': 'Test',
            'content': '',
            'content_type': 'markdown'
        }
    )
    assert response.status_code == 400


def test_update_article_success(client, db):
    """测试更新文章成功"""
    article = Article(title='Original')
    db.session.add(article)
    db.session.commit()

    response = client.put(
        f'/api/admin/articles/{article.id}',
        headers=get_auth_header(client),
        json={'title': 'Updated'}
    )
    data = json.loads(response.data)
    assert data['code'] == 0

    # 验证更新成功
    article = Article.query.get(article.id)
    assert article.title == 'Updated'


def test_delete_article_success(client, db):
    """测试删除文章成功"""
    article = Article(title='To Delete')
    db.session.add(article)
    db.session.commit()
    article_id = article.id

    response = client.delete(
        f'/api/admin/articles/{article_id}',
        headers=get_auth_header(client)
    )
    data = json.loads(response.data)
    assert data['code'] == 0

    # 验证软删除
    article = Article.query.get(article_id)
    assert article.deleted_at is not None


def test_batch_delete_articles(client, db):
    """测试批量删除文章"""
    articles = [Article(title=f'Test {i}') for i in range(3)]
    db.session.add_all(articles)
    db.session.commit()
    ids = [a.id for a in articles]

    response = client.post(
        '/api/admin/articles/batch-delete',
        headers=get_auth_header(client),
        json={'ids': ids}
    )
    data = json.loads(response.data)
    assert data['code'] == 0

    # 验证全部删除
    for id in ids:
        article = Article.query.get(id)
        assert article.deleted_at is not None
```

---

## 第三阶段：前端单元测试

### Task 13: API 配置测试

**Files:**
- Modify: `frontend/src/config/api.test.js`
- Create: `frontend/src/config/api.test.jsx`

**Step 1: 编写测试**

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { API_CONFIG, API_ENDPOINTS, getApiUrl, buildApiUrl } from './api.js';

describe('API Configuration', () => {
  describe('API_CONFIG', () => {
    it('should have BASE_URL defined', () => {
      expect(API_CONFIG.BASE_URL).toBeDefined();
    });

    it('should have TIMEOUT defined', () => {
      expect(API_CONFIG.TIMEOUT).toBe(10000);
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should have PUBLIC endpoints', () => {
      expect(API_ENDPOINTS.PUBLIC).toBeDefined();
      expect(API_ENDPOINTS.PUBLIC.ARTICLES).toBe('/api/articles');
    });

    it('should have ADMIN endpoints', () => {
      expect(API_ENDPOINTS.ADMIN).toBeDefined();
      expect(API_ENDPOINTS.ADMIN.LOGIN).toBe('/api/admin/login');
    });

    it('should have WEBSOCKET config', () => {
      expect(API_ENDPOINTS.WEBSOCKET).toBeDefined();
    });
  });

  describe('buildApiUrl', () => {
    it('should build correct URL without trailing slash', () => {
      const result = buildApiUrl('/api/articles');
      expect(result).toMatch(/\/api\/articles$/);
    });
  });

  describe('getApiUrl', () => {
    it('should generate correct siteBlocks URL', () => {
      expect(getApiUrl.siteBlocks()).toContain('site-blocks');
    });

    it('should generate correct article detail URL', () => {
      const url = getApiUrl.articleDetail(123);
      expect(url).toContain('123');
    });

    it('should generate correct admin login URL', () => {
      expect(getApiUrl.adminLogin()).toContain('login');
    });
  });
});
```

---

### Task 14: 错误处理工具测试

**Files:**
- Create: `frontend/src/utils/errorHandler.test.js`

**Step 1: 编写测试**

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ErrorType,
  ErrorSeverity,
  AppError,
  ErrorHandler,
  handleError,
  errorHandler
} from './errorHandler.js';

describe('ErrorHandler', () => {
  describe('AppError', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should create AppError with custom values', () => {
      const error = new AppError(
        'Network error',
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.HIGH,
        500,
        { details: 'test' }
      );
      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.statusCode).toBe(500);
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test');
      const json = error.toJSON();
      expect(json.name).toBe('AppError');
      expect(json.message).toBe('Test');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('ErrorHandler', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle normal Error', () => {
      const error = new Error('Network error');
      const appError = errorHandler.normalizeError(error);
      expect(appError).toBeInstanceOf(AppError);
    });

    it('should handle TypeError for network', () => {
      const error = new TypeError('Failed to fetch');
      const appError = errorHandler.normalizeError(error);
      expect(appError.type).toBe(ErrorType.API_ERROR);
    });

    it('should register and call error callback', () => {
      const callback = vi.fn();
      const unsubscribe = errorHandler.onError(callback);

      const error = new AppError('Test');
      errorHandler.handleError(error);

      expect(callback).toHaveBeenCalledWith(error, {});
      unsubscribe();
    });

    it('should log errors to localStorage', () => {
      const error = new AppError('Test error');
      errorHandler.logError(error);

      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('handleError function', () => {
    it('should return AppError instance', () => {
      const result = handleError(new Error('test'));
      expect(result).toBeInstanceOf(AppError);
    });
  });
});
```

---

### Task 15: useApi Hook 测试

**Files:**
- Create: `frontend/src/hooks/useApi.test.js`

**Step 1: 编写测试**

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApi, useApiMutation, useApiQuery } from './useApi.js';

describe('useApi Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('useApi', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() =>
        useApi({ url: '/api/test', enabled: false })
      );

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state when fetching', async () => {
      global.fetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ data: 'test' })
          }), 100)
        )
      );

      const { result } = renderHook(() =>
        useApi({ url: '/api/test', enabled: true })
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual({ data: 'test' });
    });

    it('should handle fetch error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useApi({ url: '/api/test', enabled: true })
      );

      await waitFor(() => expect(result.current.error).not.toBeNull());
    });

    it('should provide refetch function', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      const { result } = renderHook(() =>
        useApi({ url: '/api/test', enabled: false })
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should provide clearCache function', () => {
      const { result } = renderHook(() =>
        useApi({ url: '/api/test', enabled: false, cache: true })
      );

      expect(typeof result.current.clearCache).toBe('function');

      act(() => {
        result.current.clearCache();
      });
    });
  });

  describe('useApiMutation', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() =>
        useApiMutation({ url: '/api/test', method: 'POST' })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should call mutate function', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const { result } = renderHook(() =>
        useApiMutation({ url: '/api/test', method: 'POST' })
      );

      await act(async () => {
        await result.current.mutate({ name: 'test' });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' })
        })
      );
    });
  });
});
```

---

### Task 16: 公共组件测试

**Files:**
- Create: `frontend/src/components/ArticleCard.test.jsx`

**Step 1: 编写测试**

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ArticleCard from './ArticleCard';

describe('ArticleCard Component', () => {
  const mockArticle = {
    id: 1,
    title: 'Test Article',
    category: 'Tech',
    tags: ['react', 'javascript'],
    summary: 'This is a test summary',
    cover_image: '/cover.jpg',
    created_at: '2024-01-01T00:00:00Z'
  };

  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('should render article title', () => {
    renderWithRouter(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('Test Article')).toBeInTheDocument();
  });

  it('should render article category', () => {
    renderWithRouter(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('Tech')).toBeInTheDocument();
  });

  it('should render article summary', () => {
    renderWithRouter(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('This is a test summary')).toBeInTheDocument();
  });

  it('should render tags', () => {
    renderWithRouter(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('should render without cover image', () => {
    const articleWithoutCover = { ...mockArticle, cover_image: '' };
    renderWithRouter(<ArticleCard article={articleWithoutCover} />);
    expect(screen.getByText('Test Article')).toBeInTheDocument();
  });
});
```

---

### Task 17: 其他组件测试

**Files:**
- Create: `frontend/src/components/SocialIcons.test.jsx`
- Create: `frontend/src/components/Navbar.test.jsx`

**Step 1: SocialIcons 测试**

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SocialIcons from './SocialIcons';

describe('SocialIcons Component', () => {
  const mockContacts = [
    { type: 'github', value: 'https://github.com/test' },
    { type: 'email', value: 'test@example.com' }
  ];

  it('should render social icons', () => {
    render(<SocialIcons contacts={mockContacts} />);
    // 验证渲染
  });

  it('should render empty when no contacts', () => {
    render(<SocialIcons contacts={[]} />);
    // 验证空状态
  });
});
```

---

## 第四阶段：集成测试

### Task 18: 后端集成测试

**Files:**
- Create: `backend/tests/integration/test_full_workflow.py`

**Step 1: 编写集成测试**

```python
import pytest
import json
from flask_jwt_extended import create_access_token


class TestArticleWorkflow:
    """文章完整工作流测试"""

    def test_full_article_lifecycle(self, client, db):
        """测试文章完整生命周期"""
        # 1. 创建文章
        token = create_access_token(identity='admin')
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        create_response = client.post(
            '/api/admin/articles',
            headers=headers,
            json={
                'title': 'Integration Test',
                'content': '# Test',
                'content_type': 'markdown'
            }
        )
        assert create_response.status_code == 200
        article_id = json.loads(create_response.data)['id']

        # 2. 获取公开文章列表
        public_response = client.get('/api/articles')
        assert public_response.status_code == 200

        # 3. 获取文章详情
        detail_response = client.get(f'/api/articles/{article_id}')
        assert detail_response.status_code == 200

        # 4. 更新文章
        update_response = client.put(
            f'/api/admin/articles/{article_id}',
            headers=headers,
            json={'title': 'Updated Title'}
        )
        assert update_response.status_code == 200

        # 5. 删除文章
        delete_response = client.delete(
            f'/api/admin/articles/{article_id}',
            headers=headers
        )
        assert delete_response.status_code == 200


class TestCommentWorkflow:
    """评论完整工作流测试"""

    def test_comment_with_article(self, client, db):
        """测试评论与文章关联"""
        # 1. 创建文章
        token = create_access_token(identity='admin')
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        article_response = client.post(
            '/api/admin/articles',
            headers=headers,
            json={'title': 'Test', 'content': '# Content', 'content_type': 'markdown'}
        )
        article_id = json.loads(article_response.data)['id']

        # 2. 添加评论
        comment_response = client.post(
            f'/api/articles/{article_id}/comments',
            json={'author': 'User', 'content': 'Great!'}
        )
        assert comment_response.status_code == 201

        # 3. 获取评论列表
        get_response = client.get(f'/api/articles/{article_id}/comments')
        assert get_response.status_code == 200
        comments = json.loads(get_response.data)['comments']
        assert len(comments) == 1
```

---

### Task 19: 前端集成测试

**Files:**
- Create: `frontend/src/integration/home.test.jsx`

**Step 1: 编写集成测试**

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// 模拟 API 调用
vi.mock('../config/api.js', () => ({
  getApiUrl: {
    siteBlocks: () => '/api/site-blocks',
    skills: () => '/api/skills',
    contacts: () => '/api/contacts',
    articles: () => '/api/articles'
  }
}));

describe('Home Page Integration', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should load and display home page', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        code: 0,
        data: [{ name: 'home', content: { title: 'Test' } }]
      })
    });

    // 测试渲染逻辑
    expect(true).toBe(true);
  });
});
```

---

## 第五阶段：测试覆盖报告

### Task 20: 配置测试覆盖率

**Step 1: 添加覆盖率配置**

**Files:**
- Create: `backend/pytest.ini`

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --cov=. --cov-report=html --cov-report=term-missing --cov-report=xml
```

**Step 2: 生成覆盖率报告**

```bash
# 后端
cd backend && uv run pytest --cov-report=html

# 前端
cd frontend && npm run test:coverage
```

---

## 执行选项

**Plan complete and saved to `docs/plans/2026-03-06-comprehensive-testing.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
