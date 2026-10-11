# MyWebsite

个人网站:终端美学风格的 3D 博客。访客落在一个 Three.js 桌面场景,纸面上承载可玩的画板小游戏,终端命令栏支持 GitHub OAuth 登录、评论互动;后台为 Go + Gin + GORM API(PostgreSQL / pgvector),内容经四层审核链保护。

## 技术栈

- 后端:Go 1.25 · Gin · GORM · PostgreSQL + pgvector
- 前端:Next.js 16 · React 19 · MUI v9 · Three.js
- 部署:Docker Compose(edge Nginx + Next standalone + Go API),GitHub Actions 构建镜像,Gitea Actions 部署

## 快速开始

```bash
cp .env.example .env   # 按需修改
docker compose up -d --build
# 访问 http://localhost:4419
```

## 开发约定

工程纪律(留档、测试、门禁)见 [AGENTS.md](AGENTS.md);决策、计划与验收记录在 [工单](https://git.unself.cn/Handy_Wote/MyWebsite/issues) 管理。
