@echo off
echo ========================================
echo HandyWote 个人网站启动脚本
echo ========================================
echo.

echo 正在启动前端服务...
start "Frontend" cmd /k "npm run dev"

echo 等待前端服务启动...
timeout /t 3 /nobreak > nul

echo.
echo 前端服务已启动，请访问: http://localhost:5173
echo.
echo 注意：要使用完整的文章系统功能，请先设置后端服务：
echo 1. 安装 PostgreSQL 数据库
echo 2. 配置数据库连接
echo 3. 运行 python init_db.py 初始化数据库
echo 4. 启动 Flask 后端服务
echo.
echo 详细说明请查看 README.md 文件
echo.
pause 