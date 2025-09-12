# 多阶段构建：前端构建阶段
FROM docker.1ms.run/node:18-alpine AS frontend-builder

# 设置工作目录
WORKDIR /app

# 复制package文件并安装所有依赖（包括开发依赖，构建需要vite）
COPY package*.json ./
RUN npm ci

# 复制源代码并构建
COPY . .
RUN npm run build

# 最终运行阶段 - 使用Nginx作为Web服务器
FROM docker.1ms.run/nginx:alpine

# 删除默认的Nginx配置
RUN rm -rf /etc/nginx/conf.d/*

# 复制Nginx配置文件
COPY nginx.conf /etc/nginx/nginx.conf

# 从前端构建阶段复制构建好的静态文件
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# 设置静态文件权限，确保nginx可以读取
RUN chmod -R 644 /usr/share/nginx/html/ && \
    find /usr/share/nginx/html/ -type d -exec chmod 755 {} \;

# 暴露端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]