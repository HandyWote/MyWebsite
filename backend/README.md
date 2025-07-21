# 网站后端

## 🚀 快速启动

### 第一次运行（完整设置）：
```bash
python setup.py
```

### 后续启动（仅启动服务）：
```bash
python start.py
```

## 📋 功能说明

`setup.py` 会自动完成：
- ✅ 创建配置文件 (.env)
- ✅ 设置 PostgreSQL 数据库
- ✅ 创建数据库表结构
- ✅ 插入示例数据
- ✅ 启动后端服务

## 🔧 配置说明

如需修改配置，编辑 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=mywebsite

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## 📡 API 接口

- **前端 API**: http://localhost:5000/api
- **管理后台**: http://localhost:5000/admin
- **服务地址**: http://localhost:5000

## 🛠️ 依赖安装

```bash
pip install -r requirements.txt
```

## 📝 注意事项

1. 确保 PostgreSQL 已安装并运行
2. 确保 PostgreSQL 密码正确
3. 首次运行会自动创建数据库和表结构 