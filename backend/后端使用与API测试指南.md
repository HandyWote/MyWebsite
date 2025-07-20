# 后端使用与 API 测试指南

## 1. 环境准备

### 1.1 安装依赖
```bash
pip install -r requirements.txt
```

### 1.2 配置环境变量
- 推荐方式：在 `backend/` 目录下新建 `.env` 文件，内容如下（请根据实际情况修改）：

```
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yourpassword
SQLALCHEMY_DATABASE_URI=postgresql://username:password@localhost:5432/yourdb
UPLOAD_FOLDER=backend/uploads
MAX_CONTENT_LENGTH=5242880
ALLOWED_IMAGE_EXTENSIONS=jpg,jpeg,png,webp
OPENAI_API_KEY=sk-xxxx
OPENAI_MODEL=gpt-3.5-turbo
JWT_ACCESS_TOKEN_EXPIRES=86400
JWT_REMEMBER_TOKEN_EXPIRES=604800
```

### 1.3 初始化数据库
```bash
python init_db.py
```

### 1.4 启动后端服务
```bash
python app.py
```
默认监听 `http://localhost:5000`

---

## 2. 主要接口说明

所有管理接口前缀为 `/api/admin`，需先登录获取 JWT token，后续请求需在 Header 中加 `Authorization: Bearer <token>`。

### 2.1 登录获取 Token
- **POST** `/api/admin/login`
- Body (JSON)：
  ```json
  { "password": "yourpassword", "remember": true }
  ```
- 返回：
  ```json
  { "code":0, "msg":"success", "token":"..." }
  ```

### 2.2 其它接口举例
- **GET** `/api/admin/site-blocks` 获取分块内容
- **PUT** `/api/admin/site-blocks` 更新分块内容
- **GET/POST/PUT/DELETE** `/api/admin/skills` 技能管理
- **GET/POST/PUT/DELETE** `/api/admin/contacts` 联系方式管理
- **GET/POST/PUT/DELETE** `/api/admin/articles` 文章管理
- **GET/POST/PUT/DELETE** `/api/admin/avatars` 头像管理
- **GET** `/api/admin/logs` 操作日志
- **GET/POST/DELETE** `/api/admin/recycle-bin` 回收站
- **GET** `/api/admin/export` 数据导出
- **POST** `/api/admin/import` 数据导入

---

## 3. Postman 测试指南

### 3.1 登录并获取 Token
1. 新建一个 POST 请求，URL 填写：
   ```
   http://localhost:5000/api/admin/login
   ```
2. Body 选择 `raw` + `JSON`，内容如下：
   ```json
   {
     "password": "yourpassword",
     "remember": true
   }
   ```
3. 发送请求，获取返回的 `token`。

### 3.2 设置全局 Token
1. 在 Postman 的“环境变量”或“全局变量”中添加 `token` 变量，值为上一步获取的 token。
2. 在所有需要鉴权的请求 Header 中添加：
   ```
   Authorization: Bearer {{token}}
   ```

### 3.3 测试其它接口

- **获取技能列表**
  - 方法：GET
  - URL: `http://localhost:5000/api/admin/skills`
  - Header: `Authorization: Bearer {{token}}`

- **新增技能**
  - 方法：POST
  - URL: `http://localhost:5000/api/admin/skills`
  - Header: `Authorization: Bearer {{token}}`
  - Body (JSON):
    ```json
    {
      "name": "Flask",
      "description": "熟悉 Flask 后端开发",
      "level": 80
    }
    ```

- **上传头像**
  - 方法：POST
  - URL: `http://localhost:5000/api/admin/avatars`
  - Header: `Authorization: Bearer {{token}}`
  - Body 选择 `form-data`，添加 `file` 字段，类型为 File，选择图片上传。

- **导出数据**
  - 方法：GET
  - URL: `http://localhost:5000/api/admin/export`
  - Header: `Authorization: Bearer {{token}}`

### 3.4 常见问题
- **token 过期/失效**：重新登录获取新 token。
- **上传图片失败**：检查图片格式和大小是否符合要求。
- **403/401**：检查 Authorization header 是否正确，token 是否有效。

---

## 4. 常见问题与建议

- **配置安全**：生产环境请勿将敏感信息（如密码、API Key）提交到 git。
- **数据库迁移**：如需结构变更，建议使用 Flask-Migrate。
- **API 文档**：可用 Postman 导出接口集合，或用 Swagger/OpenAPI 自动生成文档。
- **定时任务**：回收站自动清理已集成 APScheduler，无需手动干预。
- **日志与监控**：建议定期导出操作日志，便于安全审计。

---

如需 Postman 导入的接口集合（.json 文件）、更详细的接口参数说明或自动化测试脚本，请联系开发负责人。 