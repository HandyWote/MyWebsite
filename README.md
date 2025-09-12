# MyWebsite Docker部署说明

## 方案一：使用分离的Docker Compose配置（推荐）

为了避免supervisord的pkg_resources弃用警告和配置文件读取错误，我们提供了新的分离式Docker Compose配置，分别运行Nginx和后端服务。

### 特点

1. **避免supervisord问题**：不再使用supervisord，避免了pkg_resources弃用警告
2. **现代化架构**：前后端服务分离，符合微服务架构理念
3. **独立扩展**：可以独立扩展前端或后端服务
4. **简化调试**：更容易定位和解决特定服务的问题

### 使用方法

```bash
# 使用docker-compose文件
docker-compose up -d
```

### 配置说明

- 前端服务运行在端口80，映射到主机的4419端口
- 后端服务运行在端口5000，通过Docker网络与前端通信
- 环境变量通过.env文件和docker-compose配置传递

## 方案二：使用原有的整合Dockerfile

原有的整合Dockerfile仍然可用，但可能会遇到supervisord相关的问题。

### Dockerfile更新说明

为了解决pkg_resources弃用警告和supervisord配置文件读取错误，我们对Dockerfile进行了以下改进：

#### 1. 解决pkg_resources弃用警告

- 使用`uv`作为Python包管理工具，它是一个现代的、快速的Python包安装程序，避免了使用旧的setuptools和pkg_resources
- 使用国内镜像源（清华大学PyPI镜像）加速依赖安装
- 通过使用`--system`标志将依赖安装到系统Python环境中，避免了虚拟环境相关的路径问题

#### 2. 修复supervisord配置文件读取错误

- 将supervisord配置文件放置在标准目录`/etc/supervisor/conf.d/`中
- 确保supervisord日志目录`/var/log/supervisor`存在并具有正确的权限
- 在supervisord配置中明确指定用户为`appuser`

#### 3. 现代化进程管理

- 使用supervisord作为进程管理器，同时管理Nginx和后端服务
- 配置了健康检查机制
- 正确设置日志输出到标准输出/标准错误，便于Docker日志收集

#### 4. 权限和安全性

- 创建非root用户`appuser`运行应用
- 正确设置文件和目录权限
- 使用多阶段构建减小最终镜像大小

## 构建和运行

```bash
# 构建镜像
docker build -t mywebsite .

# 运行容器
docker run -d -p 80:80 mywebsite
```

## 故障排除

如果遇到任何问题，请检查以下几点：

1. 确保所有配置文件都正确复制到镜像中
2. 检查supervisord配置文件中的路径和权限设置
3. 验证环境变量是否正确设置
4. 查看容器日志以获取更多错误信息：`docker logs <container_id>`
