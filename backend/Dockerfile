FROM docker.1ms.run/python:3.11

WORKDIR /app

# 设置时区
ENV TZ=Asia/Shanghai

# 配置APT使用阿里源
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 安装 pip 并配置使用清华源
RUN pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple/
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/

# 复制项目文件
COPY pyproject.toml ./

# 安装项目依赖
RUN pip install -e .
RUN pip install eventlet

# 创建非root用户和必要目录
RUN adduser --disabled-password --gecos '' appuser && \
    mkdir -p /app/uploads && \
    chown -R appuser:appuser /app && \
    chmod -R 755 /app && \
    chmod 777 /app/uploads

# 复制环境变量文件
COPY .env* ./

# 复制应用代码
COPY . .

# 确保appuser对所有文件有正确权限
RUN chown -R appuser:appuser /app && \
    chmod -R 755 /app && \
    chmod 777 /app/uploads

USER appuser

# 暴露端口
EXPOSE 5000

# 使用gunicorn启动应用
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--worker-class", "eventlet", "--worker-connections", "1000", "--max-requests", "1000", "--max-requests-jitter", "100", "--keep-alive", "5", "--timeout", "30", "app:app"]