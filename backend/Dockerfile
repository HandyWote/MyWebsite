# 使用uv提供的Python镜像作为基础镜像
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/ghcr.io/astral-sh/uv:python3.11-alpine

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY pyproject.toml uv.lock ./

# 使用uv安装依赖（更快且支持lock文件）
# 使用国内镜像源加速下载
RUN uv pip install --system -e . --index https://pypi.tuna.tsinghua.edu.cn/simple/

# 复制后端代码
COPY . .

# 创建非root用户
RUN adduser -D appuser && \
    chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 5000

# 启动应用
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--worker-class", "eventlet", "--worker-connections", "1000", "--max-requests", "1000", "--max-requests-jitter", "100", "--keep-alive", "5", "--timeout", "30", "app:app"]