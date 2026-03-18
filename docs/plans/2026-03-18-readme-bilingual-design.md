# 文档重构设计：双语言 README 目录结构

## 目标

将项目 README 重构为中英文双语言目录结构，提升可维护性和国际化体验。

## 背景

当前项目文档存在以下问题：
- README.md 内容与 CLAUDE.md 有部分重叠
- 缺少英文版本，不便于国际开发者
- 文档结构不够模块化

## 设计方案

### 目录结构

```
/home/handy/MyWebsite/
├── docs/
│   └── readme/
│       ├── zh.md      # 中文版 README
│       └── en.md      # 英文版 README
├── README.md          # 简短入口，指向双语言版本
└── CLAUDE.md         # 保留（项目配置）
```

### README.md 入口内容

简洁的中英双语入口，包含：
- 项目一句话简介
- 快速导航链接
- 语言切换说明

### 中文版 (zh.md) 内容

```markdown
# MyWebsite 个人网站

## 项目简介
Go + React 的个人网站项目...

## 技术栈
- 后端: Go + Gin + GORM
- 前端: React 19 + Vite + MUI
- 数据库: PostgreSQL
- 部署: Docker Compose + Nginx

## 快速开始

### 本地开发
[启动指令]

### Docker 部署
[部署指令]

## 项目结构
[目录树]

## API 文档
[接口列表]

## 测试
[测试命令]

## 许可证
MIT
```

### 英文版 (en.md) 内容

与中文版对应的一对一翻译，保持相同的结构和章节顺序。

## 实施步骤

1. 创建 `/docs/readme/` 目录
2. 编写 `zh.md` 完整中文文档
3. 编写 `en.md` 完整英文文档
4. 重写根目录 `README.md` 为双语言入口
5. 更新 `CLAUDE.md` 中的文档路径引用

## 验收标准

- [ ] `/docs/readme/zh.md` 存在且内容完整
- [ ] `/docs/readme/en.md` 存在且为中文版的英文翻译
- [ ] 根目录 `README.md` 提供清晰的语言导航
- [ ] 所有链接有效
- [ ] 中英文内容结构一致
