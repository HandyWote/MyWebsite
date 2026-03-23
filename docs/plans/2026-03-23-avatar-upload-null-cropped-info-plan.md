# Avatar Upload Null CroppedInfo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 `/api/admin/avatars` 在未提供 `cropped_info` 时向 PostgreSQL `jsonb` 字段写入空字符串导致的 500 错误。

**Architecture:** 从模型层修正 `avatar.cropped_info` 的空值语义，把“未设置裁剪信息”表示为 `NULL` 而不是 `""`。先删除依赖新 sqlite 驱动的测试草稿，再补一个不引入新依赖、直接验证模型零值行为的回归测试，最后以最小改动让上传路径沿用该语义。

**Tech Stack:** Go, Gin, Gorm, PostgreSQL jsonb, testify, go test

---

### Task 1: 清理不符合约束的测试草稿

**Files:**
- Modify: `backend/routes/avatar_upload_test.go:1-41`

**Step 1: 删除当前测试草稿内容**

删除依赖 `gorm.io/driver/sqlite` 的测试代码，因为仓库当前 `go.mod` 未声明该驱动，且本次约束是不引入新依赖。

**Step 2: 运行单测确认不再因缺少 sqlite 依赖而编译失败**

Run: `cd backend && go test ./routes -run TestAvatar -v`
Expected: 不再出现 `missing go.sum entry for module providing package gorm.io/driver/sqlite`

**Step 3: Commit**

```bash
git add backend/routes/avatar_upload_test.go
git commit -m "test: remove sqlite-based avatar upload draft"
```

### Task 2: 先写失败测试证明模型空值语义错误

**Files:**
- Modify: `backend/routes/avatar_upload_test.go`
- Reference: `backend/models/models.go:70-76`

**Step 1: 写失败测试**

在 `backend/routes/avatar_upload_test.go` 写一个最小测试，只验证模型默认值语义，不连数据库：

```go
func TestAvatarZeroValueDoesNotUseEmptyStringForCroppedInfo(t *testing.T) {
    avatar := models.Avatar{
        Filename:  "头像缩略.webp",
        IsCurrent: false,
    }

    if avatar.CroppedInfo == "" {
        t.Fatal("expected cropped_info zero value to map to NULL semantics, got empty string")
    }
}
```

如果最终采用指针类型，则断言改为：

```go
if avatar.CroppedInfo != nil {
    t.Fatal("expected cropped_info to default to nil")
}
```

**Step 2: 运行测试并确认按预期失败**

Run: `cd backend && go test ./routes -run TestAvatarZeroValueDoesNotUseEmptyStringForCroppedInfo -v`
Expected: FAIL，失败原因是当前 `CroppedInfo` 零值仍然是空字符串语义

**Step 3: Commit**

```bash
git add backend/routes/avatar_upload_test.go
git commit -m "test: cover avatar cropped_info null semantics"
```

### Task 3: 最小修改模型以表达 NULL 语义

**Files:**
- Modify: `backend/models/models.go:70-76`

**Step 1: 写最小实现**

把：

```go
CroppedInfo string `gorm:"type:jsonb" json:"cropped_info"`
```

改成可空表示，例如：

```go
CroppedInfo *string `gorm:"type:jsonb" json:"cropped_info"`
```

不要顺手改其他字段，不做无关重构。

**Step 2: 运行刚才的单测确认转绿**

Run: `cd backend && go test ./routes -run TestAvatarZeroValueDoesNotUseEmptyStringForCroppedInfo -v`
Expected: PASS

**Step 3: Commit**

```bash
git add backend/models/models.go backend/routes/avatar_upload_test.go
git commit -m "fix: store null cropped_info for avatars"
```

### Task 4: 验证上传路径仍按新语义工作

**Files:**
- Review: `backend/routes/public.go:137-171`
- Optional Modify: `backend/routes/public.go:161-166`（仅当编译或语义需要时）

**Step 1: 检查上传创建代码是否还需要显式调整**

确认以下代码在 `CroppedInfo` 改为指针后仍可直接创建记录：

```go
avatar := models.Avatar{
    Filename:  filename,
    IsCurrent: false,
}
```

如果无需显式赋值，就保持不动；只有在编译或行为不符合预期时才加最小改动。

**Step 2: 运行路由包相关测试**

Run: `cd backend && go test ./routes -v`
Expected: 所有 routes 包测试通过

**Step 3: Commit**

```bash
git add backend/routes/public.go backend/routes/avatar_upload_test.go backend/models/models.go
git commit -m "test: verify avatar upload null cropped_info flow"
```

### Task 5: 做最终验证，确认问题闭环

**Files:**
- Review only

**Step 1: 运行聚焦验证命令**

Run: `cd backend && go test ./routes -run TestAvatar -v && go test ./routes -v`
Expected: 头像相关测试通过，routes 包整体通过

**Step 2: 若本地可连开发库，再做一次手工接口验证**

Run after starting backend: `curl -i -X POST http://localhost:5000/api/admin/avatars -F "file=@testdata/avatar.webp"`
Expected: 返回 200/201，不再出现 PostgreSQL `SQLSTATE 22P02`

**Step 3: 记录验证结果**

在最终汇报中明确写出：
- 根因：`jsonb` 列接收了空字符串
- 修复：模型改为 NULL 语义
- 证据：新增测试名称与 `go test` 输出结果
