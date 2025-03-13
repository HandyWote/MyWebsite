# HandyWote的个人网站

这是一个使用现代前端技术栈构建的个人展示网站，采用响应式设计，支持多设备访问，并集成了流畅的动画效果。

## 技术原理

### 核心技术栈

- **React 18**: 采用最新的React框架，利用其强大的组件化和Hooks特性
- **Vite**: 基于ESM的构建工具，提供快速的开发体验和高效的构建过程
- **Material-UI**: 使用Material Design设计系统，提供美观且一致的UI组件
- **Framer Motion**: 实现流畅的页面动画和交互效果
- **React Scroll**: 实现平滑的页面滚动和导航功能

### 项目结构

```
src/
  ├── components/     # 组件目录
  │   ├── Navbar.jsx  # 导航栏组件
  │   ├── Home.jsx    # 首页组件
  │   ├── About.jsx   # 关于页组件
  │   ├── Skills.jsx  # 技能展示组件
  │   ├── Projects.jsx# 项目展示组件
  │   └── Contact.jsx # 联系方式组件
  ├── App.jsx         # 应用主组件
  ├── main.jsx        # 应用入口
  └── index.css       # 全局样式
```

### 主要功能实现

1. **响应式设计**: 使用Material-UI的响应式布局系统，适配不同屏幕尺寸
2. **动画效果**: 通过Framer Motion实现组件的进入、退出和交互动画
3. **导航系统**: 使用React Scroll实现平滑的页面内导航
4. **项目展示**: 通过GitHub API动态获取并展示个人项目

## 使用指南

### 环境要求

- Node.js 16.0.0 或更高版本
- npm 7.0.0 或更高版本

### 安装步骤

1. 克隆项目
```bash
git clone https://github.com/HandyWote/handywote.git
cd handywote
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 构建生产版本
```bash
npm run build
```

### 部署方法

1. 构建项目
```bash
npm run build
```

2. 部署dist目录到你的Web服务器或托管平台

## 开发建议

### 代码规范

1. 使用TypeScript重构项目以获得更好的类型支持
2. 添加单元测试提高代码质量
3. 使用ESLint和Prettier规范代码风格

### 性能优化

1. 实现组件懒加载
2. 优化图片资源
3. 添加缓存策略
4. 使用性能监控工具

### 功能扩展

1. 添加博客功能
2. 集成评论系统
3. 添加深色模式
4. 支持多语言

### 移动端优化

1. 优化触摸交互
2. 改善移动端性能
3. 适配不同移动设备

## 贡献指南

欢迎提交Issue和Pull Request来改进项目。在提交代码前，请确保：

1. 代码符合项目规范
2. 添加必要的测试
3. 更新相关文档

## 许可证

本项目采用MIT许可证。
