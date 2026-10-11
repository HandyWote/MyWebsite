# Repository Guidelines

# Top Rules

1. think about reuse
2. when you get an order, you just explore and plan, only edit when get approve
3. when an order has ambiguilty you must ask to make it clear
4. think about the future, your code should be used for a long time

## 留档纪律(最高优先级约定)

**docs/ 只放无状态的长期知识**——当前真相的快照,不讲历史、不带状态、不需要"状态:"头部。凡是会变卦、会过期、需要"更新记录"才能保持诚实的内容,**一律不进 docs/**。

- **决策、计划、实施细节、反馈、验收/审计记录 → 只存 gitea 工单与 PR**(https://git.unself.cn,`tea` CLI)
- **决策 = 工单**:方案背景、备选、变卦史全在 issue 评论时间线;PR 用 `closes #N` 锚定决策,"做了没做、踩了什么坑"顺着工单全可查
- **计划 = 工单**:待办功能开 issue,完成后随 PR 关闭;不再在 docs/ 维护计划文档
- docs/ 里可以出现**决策指针**(issue 号不可变,指针无状态),如"终端文案风格依据 → 工单 #xx";只放指针,不放内容
- **验收证据(截图、日志、红灯基线)只贴对应 issue/PR**,不落 docs/、不留本地散文件
- 知情项:工单/PR 只存在 git.unself.cn(GitHub 镜像不携带),定期 dump 备份

**会话约定**:动一个主题前,先 `tea issues ls --repo Handy_Wote/MyWebsite` 查有没有已开的决策/待办工单;有则引用,无则先起草给用户过目再创建。

## 测试纪律

- **测试测行为,不测实现**:断言用户可见的输入/输出/渲染结果,不断言内部调用序列、内部状态、私有函数。**重构时行为不变 ⇒ 测试 diff 必须为空**;重构被迫改测试 = 测试耦合实现(要还的债)或行为变了(那不是重构)
- **不会红的测试是负资产**:每个测试必须能死。修 bug 的 PR 先贴红灯基线(在未修复代码上复现失败);关键行为测试做变异抽查(把改动改坏,测试必红,证据贴 PR)
- **门禁唯一清单**:唯一权威是 `.github/workflows/verify.yml`,与本地跑同一套(见下节);本地全绿 CI 不该红,CI 红了以 CI 为准修本地
- 匿名用户路径、鉴权边界(401/403)、契约(前后端请求/响应形状)必须有测试

## 门禁(唯一清单,CI 与本地同一套)

来源:`.github/workflows/verify.yml`。本地开发命令:

- 后端(`cd backend`):`go test ./...` · `go vet ./...`
- 前端(`cd frontend`):`npm ci` 后 `npm run lint`(0 警告)· `npm run typecheck` · `npm run test:run` · `npm run build`
- Docker:`docker compose config --quiet` · 前后端镜像 `docker build`(verify.yml 中 docker-topology job)

**缺一不可**。只跑部分门禁会"本地全绿、CI 红"。

## Project Structure & Module Organization

This repository contains a personal website split into these main areas:

- `backend/`: Go 1.25 Gin/GORM API, routes, middleware, migrations, models, repositories, storage, and service code.
- `frontend/`: Next.js 16 App Router application with React 19, MUI v9, and Three.js. Routes live in `frontend/app`, public/admin UI and shared runtime code live in `frontend/src`, and 3D assets live in `frontend/public/3d`.
  - `frontend/src/games/`: 纸面小游戏(注册表 `registry.ts` 为唯一事实源,新游戏走注册,不散写)
  - `frontend/src/components/pixel/`: 终端风格像素 UI 基元(集中导出,新弹窗/按钮复用 PixelDialog 等,不另起炉灶)
  - `frontend/src/three/`: 3D 场景运行时(PaperScreen/PaperFocusLayer 等,层拓扑改动须过 `paper-layer-probe` e2e 探针)
- `docs/`: 无状态长期知识(见留档纪律);当前仅 `docs/readme/`(README 翻译)

Static assets are kept near the owning app, primarily under `frontend/public`.

## Build, Test, and Development Commands

- `docker-compose up -d --build`: build and run the full site, exposed at `http://localhost:4419`.
- `cd backend && go run main.go`: start the API locally on port `5000`.
- `cd backend && go test ./...`: run all backend unit and route tests.
- `cd frontend && npm run dev`: start the Next frontend dev server.
- `cd frontend && npm run build`: create a production frontend build.
- `cd frontend && npm run lint`: run ESLint (max-warnings=0).
- `cd frontend && npm run typecheck`: run `tsc --noEmit`.
- `cd frontend && npm run test:run`: run Vitest once.
- `cd frontend && npm run test:coverage`: Vitest with coverage.
- `cd frontend && npm run test:e2e`: run Playwright browser checks for the public 3D experience.

## Coding Style & Naming Conventions

Use existing file patterns when adding modules. Go code should be formatted with `gofmt`; package names are lowercase and tests use `_test.go`. Frontend code uses ES modules, React components in PascalCase, hooks prefixed with `use`; test files beside source as `*.test.ts(x)` / `*.spec.ts`. ESLint is configured for browser JavaScript/JSX, React Hooks, and React Refresh. **MUI v9**: system props 已迁移到 `sx`/`slotProps`,新代码禁止再写 system props。**UI 终端文案**:面向访客的终端风格提示统一英文小写(与 `$ name`、`// not signed in`、`signing in…` 一致),依据工单(评论账号化)。

## Testing Guidelines

Backend tests use Go's test runner plus `testify`; add focused tests near changed packages. Frontend tests use Vitest with jsdom and Testing Library; matching files are `frontend/**/*.{test,spec}.{js,jsx,ts,tsx}`. Coverage is available with `npm run test:coverage`. Browser coverage uses Playwright under `frontend/e2e`(含 mock-backend 基建 `mock-backend.mjs`)。测试纪律见上文,标准高于工具。

## Commit & Pull Request Guidelines

Recent history follows conventional-style messages such as `feat(routes): ...`, `refactor(routes): ...`, `docs: ...`, and `chore: ...`. Keep commits scoped and imperative. Pull requests should describe the change, list verification commands run (门禁清单全跑), link related issues (`closes #N`), and include screenshots for visible UI changes. **验收证据只贴 PR**,过程反馈在工单/PR 评论,不落 docs/。

## Deploy Chain

tag `v*` 推送(或手动 dispatch)→ GitHub `build.yml`:先过 verify 门禁 → 构建前后端镜像推 gitea registry(`git.unself.cn/handy_wote/mywebsite-*`)→ gitea `deploy.yml`(手动触发):SSH 到部署机 `git reset --hard origin/main` + `docker compose pull` + `up -d`。部署机已设 `core.filemode=false`(NAS ACL 会改权限位,mode 差异是噪声不是改动)。

## Security & Configuration Tips

Copy environment templates before local runs: `.env.example`, `backend/.env.example`, and `frontend/.env.example`. Do not commit secrets. Production deployments must override default admin, JWT, revalidation, application secret values, and `GITHUB_OAUTH_*` / `LOGIN_RATE_LIMIT_*`.

## Known Pitfalls(一行一条,细节在对应工单/PR)

- NAS/ACL 会让 git 全仓权限位漂移 → `core.fileMode=false`,mode-only diff 是噪声
- 3D 模式下 CSS3DRenderer 移动 DOM 会导致终端/输入失焦,守护逻辑曾误抢评论框焦点 → 聚焦修复勿简单抢焦点,方案见聚焦守护工单(待开)
- MUI v9 system props 已废弃(v9 渲染不生效),用 `sx`/`slotProps`(迁移提交 a4d5100)
- PixelDialog(h2) 内嵌套 MUI DialogTitle(h6) 会水合错误 → 标题用 span(提交 2a9974a)
- git.unself.cn SSH 端口以 `tea repos ls` 输出为准(23333);旧 2222 已失效
