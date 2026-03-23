# 头像公开访问 & 文章列表401排查 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 解决文章列表401错误，并实现头像公开访问

**Architecture:**
- 问题1：通过前端调试日志定位401错误根因
- 问题2：在public路由中确保头像文件可公开访问，前端改用公共API

**Tech Stack:** Go (Gin), React, JWT

---

## 阶段一：401错误排查

### Task 1: 前端添加调试日志

**Files:**
- Modify: `frontend/src/admin/components/ArticlesManager.jsx:73-89`

**Step 1: 在 fetchArticles 函数中添加调试日志**

在 `const res = await fetch(...)` 之前添加：

```javascript
console.log('[DEBUG] Token:', token);
console.log('[DEBUG] Request URL:', `${getApiUrl.adminArticles()}?page=${query.page}&per_page=${query.perPage}&search=${query.search}`);
```

**Step 2: 在收到响应后添加调试日志**

在 `if (!res.ok) {` 块中添加：

```javascript
console.error('[DEBUG] Response status:', res.status);
console.error('[DEBUG] Response statusText:', res.statusText);
```

**Step 3: 测试**

1. 清除浏览器缓存
2. 登录管理员账号
3. 打开 Chrome DevTools → Console 面板
4. 访问文章管理页
5. 查看 `[DEBUG]` 日志输出，确认：
   - Token 是否存在
   - Token 值是否与登录返回的一致

---

### Task 2: 如需要，后端JWT中间件添加调试日志

**Files:**
- Modify: `backend/middleware/jwt.go:18-49`

**Step 1: 在 JWTAuth 中间件添加日志**

在中间件函数开头添加：

```go
fmt.Printf("[DEBUG JWT] Received auth header: %s\n", authHeader)
```

在解析token后添加：

```go
if err != nil {
    fmt.Printf("[DEBUG JWT] Token parse error: %v\n", err)
}
```

**Step 2: 重启后端服务并测试**

```bash
cd backend && uv run app.py --debug
```

---

## 阶段二：头像公开访问

### Task 3: 确认公开头像路由存在

**Files:**
- Check: `backend/routes/public.go`
- Check: `backend/routes/routes.go:46-47`

**Step 1: 检查 public.go 是否已有头像文件路由**

```bash
grep -n "avatars/file" backend/routes/public.go
```

如果没有，添加到 public.go：

```go
// GetAvatarFile 获取头像文件（公开）
func GetAvatarFile(c *gin.Context) {
	filename := c.Param("filename")
	filepath := config.LoadConfig().UploadFolder + "/avatars/" + filename
	c.File(filepath)
}
```

**Step 2: 确认 routes.go 中路由配置**

检查 `routes.go` 第46-47行是否已有：

```go
api.GET("/avatars/file/:filename", GetAvatarFile)
```

---

### Task 4: 前端改用公共头像URL

**Files:**
- Modify: `frontend/src/admin/components/AvatarsManager.jsx:122-126`

**Step 1: 修改头像URL来源**

将：
```javascript
const url = a.filename ? getApiUrl.adminAvatarFile(a.filename) : undefined;
```

改为：
```javascript
const url = a.filename ? getApiUrl.avatarFile(a.filename) : undefined;
```

**Step 2: 测试**

1. 上传新头像
2. 确认头像管理页图片显示正常
3. 在新窗口（未登录）访问头像URL，确认可公开访问

---

## 验证清单

- [ ] 文章管理页无401错误
- [ ] 头像在管理页正常显示
- [ ] 头像URL可公开访问（无需登录）
- [ ] 现有功能（上传、删除、拖拽排序）正常

---

## 回滚计划

如有问题：
1. 问题1回滚：将 ArticlesManager.jsx 中的 console.log 删除
2. 问题2回滚：将 `avatarFile` 改回 `adminAvatarFile`
