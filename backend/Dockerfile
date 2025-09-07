FROM docker.xuanyuan.me/library/python:3.10

WORKDIR /app

# 安装 uv
RUN pip install uv

# 配置国内镜像源
RUN uv config set index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 设置时区
ENV TZ=Asia/Shanghai

# 复制项目文件
COPY pyproject.toml uv.lock ./

# 使用 uv 安装依赖
RUN uv sync --frozen

# 创建非root用户和必要目录
RUN adduser --disabled-password --gecos '' appuser && \
    mkdir -p /app/uploads && \
    chown -R appuser:appuser /app

# 复制环境变量文件
COPY .env* ./

# 复制应用代码
COPY . .

# 确保appuser对所有文件有正确权限
RUN chown -R appuser:appuser /app

USER appuser

# 暴露端口
EXPOSE 5000

# 使用gunicorn启动应用
CMD ["uv", "run", "gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--worker-class", "gevent", "--worker-connections", "1000", "--max-requests", "1000", "--max-requests-jitter", "100", "--keep-alive", "5", "--timeout", "30", "app:app"]