# 头像公开访问 & 文章列表401排查方案

## 1. 背景

### 问题1：文章列表 401 错误
- `GET /api/admin/articles?page=1&per_page=10&search=` 返回 401 (Unauthorized)
- 可能原因：token未正确存储、发送或后端验证失败

### 问题2：头像管理页图片不显示
- 当前头像文件通过 `/api/admin/avatars/file/:filename` 访问，需要JWT认证
- 但 `<Avatar>` 组件请求图片时不会带token
- 用户希望头像可以公开访问

---

## 2. 确认方案

### 问题1：401错误排查（方案A：前端调试优先）

**步骤1：前端加日志调试**
- 在 `ArticlesManager.jsx` 的 `fetchArticles` 函数中，添加console日志：
  - 打印 `localStorage.getItem('token')` 的值
  - 打印实际发送的请求header
- 如果token为空或不正确，定位到登录接口

**步骤2：登录接口检查**
- 确认 `/api/admin/login` 返回的token格式
- 确认前端是否正确存储到 `localStorage`

**步骤3：后端JWT中间件加日志（如前端排查无果）**
- 在 `backend/middleware/jwt.go` 中添加详细日志
- 记录收到的token、解析结果、错误原因

---

### 问题2：头像公开访问（方案A：新增公开路由）

**后端改动：**
1. 在 `backend/routes/public.go` 中添加公开头像文件路由：
   ```go
   api.GET("/avatars/file/:filename", GetAvatarFile)
   ```

2. 在 `backend/routes/routes.go` 中确认 `/api/avatars/file/:filename` 路由已存在（应为公开路由）

**前端改动：**
1. 在 `AvatarsManager.jsx` 中，将头像URL从：
   - `getApiUrl.adminAvatarFile(a.filename)` (需JWT)
   - 改为 `getApiUrl.avatarFile(a.filename)` (公开)

---

## 3. 数据流变更

### 头像访问路径变更

```
现状：
  管理后台请求 → /api/admin/avatars/file/:filename → JWT验证 → 返回文件

方案后：
  管理后台请求 → /api/avatars/file/:filename → 公开访问 → 返回文件
```

---

## 4. 测试计划

### 问题1测试
1. 清除浏览器缓存和localStorage
2. 重新登录管理员账号
3. 打开Chrome DevTools → Network面板
4. 访问文章管理页，确认：
   - 请求中 `Authorization: Bearer xxx` header是否存在
   - token值与登录接口返回的是否一致

### 问题2测试
1. 上传新头像
2. 在头像管理页直接确认图片是否显示
3. 在新窗口（未登录）直接访问头像URL，确认可公开访问

---

## 5. 影响范围

| 文件 | 改动类型 |
|------|----------|
| `frontend/src/admin/components/AvatarsManager.jsx` | 修改头像URL来源 |
| `backend/routes/public.go` | 确认公开路由存在（可选） |
| `frontend/src/admin/components/ArticlesManager.jsx` | 添加调试日志（临时） |
| `backend/middleware/jwt.go` | 添加调试日志（临时，如需要） |

---

## 6. 优先执行顺序

1. **先排查401问题**：确认是前端还是后端的问题
2. **再实现头像公开访问**：基于401问题解决后的上下文
