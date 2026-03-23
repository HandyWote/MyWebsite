# Database Migration Design - Python to Go

**Date:** 2026-03-23
**Status:** Approved

## 背景

项目从 Python/Flask 后端迁移到 Go/Gin 后端，数据库模型存在差异，需要在服务启动时自动完成数据迁移。

## 迁移范围

### 需要迁移的表

| 表名 | 操作类型 | 说明 |
|------|----------|------|
| `site_block` | 添加列 | `created_at` - Python版无此列 |
| `ai_settings` | 添加列 | `created_at` - Python版无此列 |
| `avatar` | 数据转换 | `cropped_info` - JSON → JSON字符串 |

### 无需迁移的表

- `article` - 字段结构一致
- `comments` - 字段结构一致
- `skill` - 字段结构一致
- `contact` - 字段结构一致

## 迁移方案

### 架构设计

```
┌─────────────────────────────────────────┐
│            服务启动 (main.go)             │
│                                          │
│  1. database.Connect()                   │
│  2. database.AutoMigrate()               │
│  3. migrations.RunMigrations() ◄── 扩展 │
│  4. seedData()                           │
│  5. 启动 Gin 服务                        │
└─────────────────────────────────────────┘
```

### 迁移执行流程

#### Step 1: 添加 site_block.created_at

```sql
ALTER TABLE site_block ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
```

#### Step 2: 添加 ai_settings.created_at

```sql
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
```

#### Step 3: 转换 avatar.cropped_info

- Python版存储为 `jsonb` 类型
- Go版期望为 `text/varchar` 类型（存储序列化后的JSON字符串）

```sql
-- 检测当前类型并转换
ALTER TABLE avatar ALTER COLUMN cropped_info TYPE TEXT;
```

### 幂等性保障

- 每个迁移步骤使用 `IF NOT EXISTS` 或条件检查
- 已存在的列/已完成的转换会被跳过
- 不影响新部署的干净数据库

## 实现文件

- `backend/migrations/migrate.go` - 扩展现有迁移逻辑

## 错误处理策略

- **迁移失败**: 打印错误日志，**不阻止服务启动**
- **迁移成功**: 记录完成状态
- **部分失败**: 下次启动时重试

## 数据兼容性

| 场景 | 处理方式 |
|------|----------|
| 新部署 + 空数据库 | GORM AutoMigrate 创建所有表 |
| 新部署 + 旧数据库 | 迁移脚本只添加缺失列，不碰现有数据 |
| 已有新结构 | 迁移检查发现已存在，跳过 |

## 后续优化方向

- 添加 migrations 表记录版本号
- 支持迁移回滚能力
- 复杂的数据转换支持
