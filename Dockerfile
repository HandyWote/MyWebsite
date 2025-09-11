# 多阶段构建：前端构建阶段
FROM docker.1ms.run/node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ .
RUN npm run build

# 多阶段构建：后端构建阶段  
FROM docker.1ms.run/python:3.11 AS backend-builder
WORKDIR /app/backend
COPY backend/ .
RUN pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple/ && \
    pip install -e . && \
    pip install eventlet

# 最终运行阶段
FROM docker.1ms.run/nginx:alpine
WORKDIR /app

# 安装Python运行时和supervisor
RUN apk add --no-cache python3 py3-pip supervisor && \
    pip3 install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple/

# 复制Nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 复制supervisor配置
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 从前端构建阶段复制构建好的静态文件
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# 从后端构建阶段复制Python应用
COPY --from=backend-builder /app/backend /app/backend

# 创建非root用户和必要目录
RUN adduser -D -g '' appuser && \
    mkdir -p /app/backend/uploads && \
    chown -R appuser:appuser /app && \
    chmod -R 755 /app && \
    chmod 777 /app/backend/uploads && \
    chown -R appuser:appuser /var/lib/nginx && \
    chown -R appuser:appuser /var/log/nginx && \
    chown -R appuser:appuser /var/cache/nginx

# 复制环境变量文件
COPY backend/.env* /app/backend/

# 设置时区
ENV TZ=Asia/Shanghai

# 暴露端口
EXPOSE 80

# 切换到非root用户
USER appuser

# 使用supervisor启动所有服务
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]