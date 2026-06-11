# 性能优化设计文档

日期：2026-06-11

## 背景

部署后打开网站存在两个问题：
1. 3D 场景页面出现 503 Service Unavailable（实际来自 iframe 内 `/app/` 的 SW 拦截）
2. 3D 场景加载缓慢——所有资源（模型 + 纹理）全部下载完才显示场景

附加问题：
- 3Dend 中存在可转 WebP 的 JPG/PNG 资源
- 存在未使用的孤儿文件 `reflection-compressed.png`
- Nginx `/app/` 路径下静态资源缺少缓存头

## 模块 1：移除 Service Worker

### 问题
SW 作用域 `/app/`，预缓存仅 4 个 URL。iframe 加载 `/app/` 时 SW 激活（skipWaiting），拦截 JS/CSS 请求，fetch 失败时返回合成 503。

### 方案
完全移除 SW。用户确认不需要离线/PWA 功能。

### 改动
- 删除 `frontend/public/sw.js`
- 删除 `frontend/public/manifest.json`
- 移除 `frontend/index.html` 中 SW 注册相关代码（如有）
- 移除 `frontend/src/main.jsx` 中 `navigator.serviceWorker.register()` 调用（如有）

## 模块 2：几何优先渐进加载

### 问题
`Resources.ts` 加载 8 个资源（3 GLB + 5 纹理，共 ~1.3MB），全部完成后才触发 `ready` 事件。`World.ts` 等待 `ready` 才创建场景和移动相机。

### 方案
- GLB 模型（~292KB）加载完 → 立即创建场景（深灰色占位材质）→ 相机进入 IDLE
- 纹理（~1024KB）逐个下载完 → 立即贴上，不等其他纹理
- MonitorScreen 叠加层在纹理就绪后才创建

### 改动

#### `sources.ts`
每个资源增加 `group: 'geometry' | 'texture'` 标记。

#### `Resources.ts`
- 新增 `geometryReady` 事件：所有 `group='geometry'` 资源加载完时触发
- 新增 `textureLoaded` 事件：每个纹理加载完时触发，参数 `(sourceName, texture)`
- 保留 `allReady` 事件（全部完成时触发）

#### `BakedModel.ts`
- 构造函数改为可选 texture 参数，无 texture 时用 `MeshBasicMaterial({ color: 0x333333 })`
- 新增 `applyTexture(texture)` 方法：设置 `material.map = texture` + `material.needsUpdate = true`

#### `Computer.ts` / `Environment.ts` / `Decor.ts`
- 暴露 `applyTexture(texture)` 方法，委托给内部 BakedModel

#### `World.ts`
- 监听 `geometryReady`：创建所有场景对象（无纹理占位）+ 触发相机进入 IDLE
- 监听 `textureLoaded`：按名称分发贴图到对应对象

#### `MonitorScreen.ts`
- 构造时跳过纹理叠加层创建
- 新增 `addSmudgeLayer(texture)` 和 `addShadowLayer(texture)` 方法
- 纹理层创建时 opacity: 0，通过补间动画淡入到目标 opacity

#### `Application.ts`
- 相机 LOADING → IDLE 的触发从 `resources.ready` 改为 `resources.geometryReady`

## 模块 3：资源格式优化

### 改动
| 操作 | 文件 | 预估节省 |
|------|------|----------|
| 转 WebP | `static/textures/monitor/layers/compressed/smudges.jpg` | ~200KB |
| 转 WebP | `static/textures/monitor/layers/compressed/shadow-compressed.png` | ~33KB |
| 删除 | `static/textures/monitor/layers/compressed/reflection-compressed.png` | 128KB |
| 更新引用 | `sources.ts` 中对应 path 的扩展名 | - |

Three.js TextureLoader 自动支持 WebP，无需修改加载代码。

## 模块 4：Nginx 缓存头修复

### 问题
`nginx.web.conf` 中 `location ^~ /app/` 优先级高于 `location ~* \.(js|css|...)$`，导致 `/app/` 下静态资源无 `Cache-Control` 和 `expires` 头。

### 方案
调整 location 结构，确保 `/app/` 下的 JS/CSS/图片等静态资源获得 `Cache-Control: public, immutable` 和 `expires 30d`。

### 约束
Nginx 不允许在 `^~` location 内嵌套 regex location。需要将静态资源的正则匹配放在 `^~ /app/` 之前，或使用 `map` 指令按文件扩展名动态添加缓存头。

## 不做的事

- 不改变 3Dend 的 Vite 构建配置
- 不修改 iframe 加载逻辑（`MonitorScreen.ts:184` 的 `iframe.src = '/app/'`）
- 不转换 `preview-new.jpg`（OG 社交分享图片，部分平台不支持 WebP）
- 不添加加载进度条 UI（已移除的功能）
