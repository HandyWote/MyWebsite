# 使用Python 3.11的官方镜像作为基础镜像
FROM docker.1ms.run/python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制后端代码
COPY . .

# 安装uv包管理工具
RUN pip install uv

# 使用uv安装依赖（更快且支持lock文件）
# 使用国内镜像源加速下载
RUN uv pip install --system -e . --index https://pypi.tuna.tsinghua.edu.cn/simple/ && \
    uv pip install --system eventlet gunicorn --index https://pypi.tuna.tsinghua.edu.cn/simple/

# 创建非root用户
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 5000

# 启动应用
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--worker-class", "eventlet", "--worker-connections", "1000", "--max-requests", "1000", "--max-requests-jitter", "100", "--keep-alive", "5", "--timeout", "30", "app:app"]