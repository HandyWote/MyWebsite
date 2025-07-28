FROM docker.xuanyuan.me/library/python:3.10

WORKDIR /app

# 配置国内镜像源
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 设置时区
ENV TZ=Asia/Shanghai

# 复制requirements文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 安装生产环境需要的gunicorn和gevent
RUN pip install gunicorn gevent

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
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--worker-class", "gevent", "--worker-connections", "1000", "--max-requests", "1000", "--max-requests-jitter", "100", "--keep-alive", "5", "--timeout", "30", "app:app"]