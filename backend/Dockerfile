FROM docker.xuanyuan.me/library/python:3.11-slim

WORKDIR /app

# 设置时区
ENV TZ=Asia/Shanghai

# 配置APT使用阿里源
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 安装 uv（尝试多个源）
RUN pip install uv -i https://pypi.tuna.tsinghua.edu.cn/simple/ || \
    pip install uv -i https://mirrors.aliyun.com/pypi/simple/ || \
    pip install uv

# 复制项目文件
COPY pyproject.toml uv.lock ./

# 配置uv使用国内源（尝试多个源）
RUN uv sync --frozen --index-url https://pypi.tuna.tsinghua.edu.cn/simple/ || \
    uv sync --frozen --index-url https://mirrors.aliyun.com/pypi/simple/ || \
    uv sync --frozen

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
CMD ["uv", "run", "gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--worker-class", "eventlet", "--worker-connections", "1000", "--max-requests", "1000", "--max-requests-jitter", "100", "--keep-alive", "5", "--timeout", "30", "app:app"]