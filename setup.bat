@echo off
echo ========================================
echo HandyWote 快速设置脚本
echo ========================================
echo.

echo 正在安装前端依赖...
call npm install

echo.
echo 前端依赖安装完成！
echo.
echo 下一步操作：
echo 1. 运行 start.bat 启动前端服务
echo 2. 如果要使用文章系统，请设置后端：
echo    - 安装 PostgreSQL
echo    - 复制 backend/config_example.py 为 backend/config.py
echo    - 修改数据库连接信息
echo    - 运行 python init_db.py 初始化数据库
echo    - 启动 Flask 后端服务
echo.
echo 详细说明请查看 README.md 文件
echo.
pause 