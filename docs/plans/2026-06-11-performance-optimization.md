# 性能优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 iframe 内 503 错误，实现 3D 场景几何优先渐进加载，优化资源格式

**Architecture:** 移除 Service Worker 消除 503 根因；Resources.ts 新增 `geometryReady` / `textureLoaded` 事件实现两阶段加载；BakedModel 支持无纹理构造 + 后续 applyTexture；Nginx 修复 `/app/` 缓存头

**Tech Stack:** TypeScript, Three.js, Jest, Nginx, Vite

---

### Task 1: 移除 Service Worker

**Files:**
- Delete: `frontend/public/sw.js`
- Delete: `frontend/public/manifest.json`
- Modify: `frontend/index.html:38-45`

- [ ] **Step 1: 删除 SW 和 manifest 文件**

```bash
rm frontend/public/sw.js
rm frontend/public/manifest.json
```

- [ ] **Step 2: 清理 index.html 中的 PWA 引用**

删除 `frontend/index.html` 中的以下行：
```html
<!-- PWA支持 -->
<link rel="manifest" href="./manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="HandyWote" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="msapplication-TileColor" content="#1976d2" />
<meta name="msapplication-tap-highlight" content="no" />
```

- [ ] **Step 3: 搜索并移除代码中的 SW 注册逻辑**

```bash
cd frontend && grep -rn "serviceWorker" src/
```

如果找到 `navigator.serviceWorker.register(...)` 调用，将其删除。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore(frontend): remove service worker and PWA manifest"
```

---

### Task 2: 扩展 Resource 类型定义

**Files:**
- Modify: `3Dend/src/types.d.ts:7-23`
- Modify: `3Dend/src/Application/sources.ts`

- [ ] **Step 1: 在类型定义中添加 `group` 字段**

修改 `3Dend/src/types.d.ts`，给 `TextureResource` 和 `ModelResource` 各加一个 `group` 字段：

```typescript
type TextureResource = {
    name: string;
    type: 'texture';
    path: string;
    group: 'geometry' | 'texture';
};

type ModelResource = {
    name: string;
    type: 'gltfModel';
    path: string;
    group: 'geometry' | 'texture';
};
```

- [ ] **Step 2: 在 sources.ts 中添加 group 标记**

修改 `3Dend/src/Application/sources.ts`，所有 `gltfModel` 标记为 `group: 'geometry'`，所有 `texture` 标记为 `group: 'texture'`：

```typescript
const sources: Resource[] = [
    {
        name: 'computerSetupModel',
        type: 'gltfModel',
        path: 'models/Computer/computer_setup.glb',
        group: 'geometry',
    },
    {
        name: 'computerSetupTexture',
        type: 'texture',
        path: 'models/Computer/baked_computer.webp',
        group: 'texture',
    },
    {
        name: 'environmentModel',
        type: 'gltfModel',
        path: 'models/World/environment.glb',
        group: 'geometry',
    },
    {
        name: 'environmentTexture',
        type: 'texture',
        path: 'models/World/baked_environment.webp',
        group: 'texture',
    },
    {
        name: 'decorModel',
        type: 'gltfModel',
        path: 'models/Decor/decor.glb',
        group: 'geometry',
    },
    {
        name: 'decorTexture',
        type: 'texture',
        path: 'models/Decor/baked_decor_modified.webp',
        group: 'texture',
    },
    {
        name: 'monitorSmudgeTexture',
        type: 'texture',
        path: 'textures/monitor/layers/compressed/smudges.jpg',
        group: 'texture',
    },
    {
        name: 'monitorShadowTexture',
        type: 'texture',
        path: 'textures/monitor/layers/compressed/shadow-compressed.png',
        group: 'texture',
    },
];
```

> 保持原扩展名。扩展名将在 Task 9（资源转换）中统一更新。

- [ ] **Step 3: 提交**

```bash
git add 3Dend/src/types.d.ts 3Dend/src/Application/sources.ts
git commit -m "feat(3dend): add group field to Resource type and sources"
```

---

### Task 3: 重构 Resources.ts 支持两阶段事件（TDD）

**Files:**
- Create: `3Dend/tests/resources-events.test.ts`
- Modify: `3Dend/src/Application/Utils/Resources.ts`

- [ ] **Step 1: 编写失败的测试**

创建 `3Dend/tests/resources-events.test.ts`：

```typescript
/**
 * Resources 两阶段加载事件测试
 */
describe('Resources two-phase events', () => {
    let Events: any;
    let Resources: any;

    beforeAll(() => {
        // Mock THREE loaders
        jest.mock('three', () => ({
            TextureLoader: jest.fn().mockImplementation(() => ({
                load: jest.fn((url, cb) => {
                    cb({ encoding: 0 });
                }),
            })),
            CubeTextureLoader: jest.fn().mockImplementation(() => ({
                load: jest.fn((urls, cb) => {
                    cb({});
                }),
            })),
            sRGBEncoding: 3001,
        }));
        jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
            GLTFLoader: jest.fn().mockImplementation(() => ({
                load: jest.fn((url, cb) => {
                    cb({ scene: { traverse: jest.fn() } });
                }),
            })),
        }));

        // Mock Application to break singleton cycle
        jest.doMock('../Application', () => ({
            default: class MockApplication {
                loading = {
                    trigger: jest.fn(),
                };
            },
        }));
        jest.doMock('./Loading', () => ({
            default: class MockLoading {
                trigger = jest.fn();
                application = { loading: { trigger: jest.fn() } };
            },
        }));

        Resources = require('../src/Application/Utils/Resources').default;
    });

    test('在所有 geometry 资源加载完后触发 geometryReady', () => {
        const onGeometryReady = jest.fn();
        const sources = [
            { name: 'model1', type: 'gltfModel', path: 'a.glb', group: 'geometry' },
            { name: 'model2', type: 'gltfModel', path: 'b.glb', group: 'geometry' },
            { name: 'tex1', type: 'texture', path: 'a.webp', group: 'texture' },
        ];
        const res = new Resources(sources);
        res.on('geometryReady', onGeometryReady);

        // geometryReady should fire after both models load (synchronous in mock)
        expect(onGeometryReady).toHaveBeenCalledTimes(1);
    });

    test('在每个 texture 资源加载完后触发 textureLoaded 事件', () => {
        const onTextureLoaded = jest.fn();
        const sources = [
            { name: 'model1', type: 'gltfModel', path: 'a.glb', group: 'geometry' },
            { name: 'tex1', type: 'texture', path: 'a.webp', group: 'texture' },
            { name: 'tex2', type: 'texture', path: 'b.webp', group: 'texture' },
        ];
        const res = new Resources(sources);
        res.on('textureLoaded', onTextureLoaded);

        expect(onTextureLoaded).toHaveBeenCalledTimes(2);
        expect(onTextureLoaded).toHaveBeenCalledWith('tex1', expect.any(Object));
        expect(onTextureLoaded).toHaveBeenCalledWith('tex2', expect.any(Object));
    });

    test('在全部资源加载完后仍触发 allReady 事件', () => {
        const onAllReady = jest.fn();
        const sources = [
            { name: 'model1', type: 'gltfModel', path: 'a.glb', group: 'geometry' },
            { name: 'tex1', type: 'texture', path: 'a.webp', group: 'texture' },
        ];
        const res = new Resources(sources);
        res.on('ready', onAllReady);

        expect(onAllReady).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd 3Dend && npx jest tests/resources-events.test.ts --no-coverage 2>&1 | tail -20
```

预期：测试失败，因为 `geometryReady` 和 `textureLoaded` 事件尚未实现。

- [ ] **Step 3: 实现 Resources.ts 两阶段事件**

修改 `3Dend/src/Application/Utils/Resources.ts`。在 `sourceLoaded` 方法中添加两阶段事件逻辑：

```typescript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Application from '../Application';
import EventEmitter from './EventEmitter';
import Loading from './Loading';

export default class Resources extends EventEmitter {
    sources: Resource[];
    items: {
        texture: { [name: string]: LoadedTexture };
        cubeTexture: { [name: string]: LoadedCubeTexture };
        gltfModel: { [name: string]: LoadedModel };
    };
    toLoad: number;
    loaded: number;
    geometryToLoad: number;
    geometryLoaded: number;
    loaders: {
        gltfLoader: GLTFLoader;
        textureLoader: THREE.TextureLoader;
        cubeTextureLoader: THREE.CubeTextureLoader;
    };
    application: Application;
    loading: Loading;

    constructor(sources: Resource[]) {
        super();

        this.sources = sources;

        this.items = { texture: {}, cubeTexture: {}, gltfModel: {} };
        this.toLoad = this.sources.length;
        this.loaded = 0;
        this.geometryToLoad = this.sources.filter(s => s.group === 'geometry').length;
        this.geometryLoaded = 0;
        this.application = new Application();
        this.loading = this.application.loading;

        this.setLoaders();
        this.startLoading();
    }

    setLoaders() {
        this.loaders = {
            gltfLoader: new GLTFLoader(),
            textureLoader: new THREE.TextureLoader(),
            cubeTextureLoader: new THREE.CubeTextureLoader(),
        };
    }

    startLoading() {
        for (const source of this.sources) {
            if (source.type === 'gltfModel') {
                this.loaders.gltfLoader.load(source.path, (file) => {
                    this.sourceLoaded(source, file);
                });
            } else if (source.type === 'texture') {
                this.loaders.textureLoader.load(source.path, (file) => {
                    file.encoding = THREE.sRGBEncoding;
                    this.sourceLoaded(source, file);
                });
            } else if (source.type === 'cubeTexture') {
                this.loaders.cubeTextureLoader.load(source.path, (file) => {
                    this.sourceLoaded(source, file);
                });
            }
        }
    }

    sourceLoaded(source: Resource, file: LoadedResource) {
        this.items[source.type][source.name] = file;

        this.loaded++;

        this.loading.trigger('loadedSource', [
            source.name,
            this.loaded,
            this.toLoad,
        ]);

        // 两阶段事件：纹理逐个通知
        if (source.group === 'texture') {
            this.trigger('textureLoaded', [source.name, file]);
        }

        // 两阶段事件：几何全部就绪
        if (source.group === 'geometry') {
            this.geometryLoaded++;
            if (this.geometryLoaded === this.geometryToLoad) {
                this.trigger('geometryReady');
            }
        }

        // 全部就绪（保留原有行为）
        if (this.loaded === this.toLoad) {
            this.trigger('ready');
        }
    }
}
```

关键改动：
- 新增 `geometryToLoad` 和 `geometryLoaded` 计数器
- `sourceLoaded` 中：纹理资源触发 `textureLoaded`，几何资源计数并在全部完成时触发 `geometryReady`
- 保留原有 `ready` 事件不变

- [ ] **Step 4: 运行测试确认通过**

```bash
cd 3Dend && npx jest tests/resources-events.test.ts --no-coverage 2>&1 | tail -20
```

预期：全部通过。

- [ ] **Step 5: 提交**

```bash
git add 3Dend/tests/resources-events.test.ts 3Dend/src/Application/Utils/Resources.ts
git commit -m "feat(3dend): add geometryReady and textureLoaded events to Resources"
```

---

### Task 4: 重构 BakedModel 支持可选纹理（TDD）

**Files:**
- Create: `3Dend/tests/baked-model.test.ts`
- Modify: `3Dend/src/Application/Utils/BakedModel.ts`

- [ ] **Step 1: 编写失败的测试**

创建 `3Dend/tests/baked-model.test.ts`：

```typescript
/**
 * BakedModel 无纹理构造和延迟贴图测试
 */
describe('BakedModel', () => {
    const createMockModel = () => ({
        scene: {
            traverse: jest.fn((cb: Function) => {
                cb({ isMesh: true, scale: { set: jest.fn() }, material: {} });
            }),
        },
    });

    const createMockTexture = () => ({
        flipY: true,
        encoding: 0,
    });

    test('无纹理构造时使用深灰色占位材质', () => {
        const BakedModel = require('../src/Application/Utils/BakedModel').default;
        const mockModel = createMockModel();

        const baked = new BakedModel(mockModel, undefined, 900);

        expect(baked.getModel()).toBe(mockModel.scene);
    });

    test('applyTexture 设置 material.map 并标记 needsUpdate', () => {
        const BakedModel = require('../src/Application/Utils/BakedModel').default;
        const mockModel = createMockModel();
        const mockTexture = createMockTexture();

        const baked = new BakedModel(mockModel, undefined, 900);
        baked.applyTexture(mockTexture);

        expect(baked.material.map).toBe(mockTexture);
        expect(baked.material.needsUpdate).toBe(true);
    });

    test('有纹理构造时保持原有行为', () => {
        const BakedModel = require('../src/Application/Utils/BakedModel').default;
        const mockModel = createMockModel();
        const mockTexture = createMockTexture();

        const baked = new BakedModel(mockModel, mockTexture, 900);

        expect(baked.material.map).toBe(mockTexture);
    });
});
```

> 注意：`isMesh` 在 Jest 环境下不会被自动识别为 `THREE.Mesh` 实例。BakedModel 使用 `child instanceof THREE.Mesh`，在测试中需要 mock。如果 instanceof 检查导致测试困难，可改为鸭子类型检查（`child.isMesh` 或同时检查两者）。

- [ ] **Step 2: 运行测试确认失败**

```bash
cd 3Dend && npx jest tests/baked-model.test.ts --no-coverage 2>&1 | tail -20
```

- [ ] **Step 3: 实现 BakedModel 无纹理构造**

修改 `3Dend/src/Application/Utils/BakedModel.ts`：

```typescript
import * as THREE from 'three';

export default class BakedModel {
    model: LoadedModel;
    texture: LoadedTexture | undefined;
    material: THREE.MeshBasicMaterial;

    constructor(model: LoadedModel, texture?: LoadedTexture, scale?: number) {
        this.model = model;
        this.texture = texture;

        if (this.texture) {
            this.texture.flipY = false;
            this.texture.encoding = THREE.sRGBEncoding;

            this.material = new THREE.MeshBasicMaterial({
                map: this.texture,
            });
        } else {
            this.material = new THREE.MeshBasicMaterial({
                color: 0x333333,
            });
        }

        this.model.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (scale) child.scale.set(scale, scale, scale);
                child.material = this.material;
            }
        });

        return this;
    }

    applyTexture(texture: LoadedTexture) {
        this.texture = texture;
        this.texture.flipY = false;
        this.texture.encoding = THREE.sRGBEncoding;
        this.material.map = this.texture;
        this.material.needsUpdate = true;
    }

    getModel(): THREE.Group {
        return this.model.scene;
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd 3Dend && npx jest tests/baked-model.test.ts --no-coverage 2>&1 | tail -20
```

- [ ] **Step 5: 提交**

```bash
git add 3Dend/tests/baked-model.test.ts 3Dend/src/Application/Utils/BakedModel.ts
git commit -m "feat(3dend): support optional texture in BakedModel with applyTexture"
```

---

### Task 5: 更新 Computer / Environment / Decor 支持延迟贴图

**Files:**
- Modify: `3Dend/src/Application/World/Computer.ts`
- Modify: `3Dend/src/Application/World/Environment.ts`
- Modify: `3Dend/src/Application/World/Decor.ts`

三个文件改动模式完全相同：构造时不传纹理，新增 `applyTexture()` 方法。

- [ ] **Step 1: 修改 Computer.ts**

```typescript
import * as THREE from 'three';
import Application from '../Application';
import BakedModel from '../Utils/BakedModel';
import Resources from '../Utils/Resources';

export default class Computer {
    application: Application;
    scene: THREE.Scene;
    resources: Resources;
    bakedModel: BakedModel;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.resources = this.application.resources;

        this.bakeModel();
        this.setModel();
    }

    bakeModel() {
        this.bakedModel = new BakedModel(
            this.resources.items.gltfModel.computerSetupModel,
            undefined,
            900
        );
    }

    setModel() {
        this.scene.add(this.bakedModel.getModel());
    }

    applyTexture(texture: LoadedTexture) {
        this.bakedModel.applyTexture(texture);
    }
}
```

- [ ] **Step 2: 修改 Environment.ts**

```typescript
import * as THREE from 'three';
import Application from '../Application';
import BakedModel from '../Utils/BakedModel';
import Resources from '../Utils/Resources';

export default class Environment {
    application: Application;
    scene: THREE.Scene;
    resources: Resources;
    bakedModel: BakedModel;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.resources = this.application.resources;

        this.bakeModel();
        this.setModel();
    }

    bakeModel() {
        this.bakedModel = new BakedModel(
            this.resources.items.gltfModel.environmentModel,
            undefined,
            900
        );
    }

    setModel() {
        this.scene.add(this.bakedModel.getModel());
    }

    applyTexture(texture: LoadedTexture) {
        this.bakedModel.applyTexture(texture);
    }

    update() {}
}
```

- [ ] **Step 3: 修改 Decor.ts**

```typescript
import * as THREE from 'three';
import Application from '../Application';
import BakedModel from '../Utils/BakedModel';
import Resources from '../Utils/Resources';

export default class Decor {
    application: Application;
    scene: THREE.Scene;
    resources: Resources;
    bakedModel: BakedModel;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.resources = this.application.resources;

        this.bakeModel();
        this.setModel();
    }

    bakeModel() {
        this.bakedModel = new BakedModel(
            this.resources.items.gltfModel.decorModel,
            undefined,
            900
        );
    }

    setModel() {
        this.scene.add(this.bakedModel.getModel());
    }

    applyTexture(texture: LoadedTexture) {
        this.bakedModel.applyTexture(texture);
    }
}
```

- [ ] **Step 4: 提交**

```bash
git add 3Dend/src/Application/World/Computer.ts 3Dend/src/Application/World/Environment.ts 3Dend/src/Application/World/Decor.ts
git commit -m "feat(3dend): support deferred texture in Computer, Environment, Decor"
```

---

### Task 6: 更新 Camera 触发为 geometryReady

**Files:**
- Modify: `3Dend/src/Application/Camera/Camera.ts:150-154`

- [ ] **Step 1: 修改 Camera.ts 的 setPostLoadTransition**

将 `ready` 事件改为 `geometryReady`：

```typescript
setPostLoadTransition() {
    this.resources.on('geometryReady', () => {
        this.transition(CameraKey.IDLE, 2500, TWEEN.Easing.Exponential.Out);
    });
}
```

- [ ] **Step 2: 提交**

```bash
git add 3Dend/src/Application/Camera/Camera.ts
git commit -m "feat(3dend): trigger camera IDLE transition on geometryReady"
```

---

### Task 7: 更新 World.ts 两阶段场景构建

**Files:**
- Modify: `3Dend/src/Application/World/World.ts`

- [ ] **Step 1: 重写 World.ts**

```typescript
import Application from '../Application';
import Resources from '../Utils/Resources';
import ComputerSetup from './Computer';
import MonitorScreen from './MonitorScreen';
import Environment from './Environment';
import Decor from './Decor';
import Cursor from './Cursor';
import Hitboxes from './Hitboxes';

export default class World {
    application: Application;
    scene: THREE.Scene;
    resources: Resources;

    environment: Environment;
    decor: Decor;
    computerSetup: ComputerSetup;
    monitorScreen: MonitorScreen;
    cursor: Cursor;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.resources = this.application.resources;

        // 阶段1：几何就绪 → 创建场景（无纹理占位）
        this.resources.on('geometryReady', () => {
            this.environment = new Environment();
            this.decor = new Decor();
            this.computerSetup = new ComputerSetup();
            this.monitorScreen = new MonitorScreen();
            // const hb = new Hitboxes();
            // this.cursor = new Cursor();
        });

        // 阶段2：纹理逐个就绪 → 无感贴图
        this.resources.on('textureLoaded', (sourceName: string, texture: LoadedTexture) => {
            if (!this.computerSetup) return; // 场景尚未创建

            switch (sourceName) {
                case 'computerSetupTexture':
                    this.computerSetup.applyTexture(texture);
                    break;
                case 'environmentTexture':
                    this.environment.applyTexture(texture);
                    break;
                case 'decorTexture':
                    this.decor.applyTexture(texture);
                    break;
                case 'monitorSmudgeTexture':
                    this.monitorScreen.addSmudgeLayer(texture);
                    break;
                case 'monitorShadowTexture':
                    this.monitorScreen.addShadowLayer(texture);
                    break;
            }
        });
    }

    update() {
        if (this.monitorScreen) this.monitorScreen.update();
        if (this.environment) this.environment.update();
    }
}
```

关键改动：
- 原来监听 `ready` → 现在监听 `geometryReady`
- 新增监听 `textureLoaded` 逐个分发贴图
- `if (!this.computerSetup) return` 防止纹理先于几何到达时的竞态

- [ ] **Step 2: 提交**

```bash
git add 3Dend/src/Application/World/World.ts
git commit -m "feat(3dend): two-phase scene creation in World"
```

---

### Task 8: 更新 MonitorScreen 支持延迟纹理层

**Files:**
- Modify: `3Dend/src/Application/World/MonitorScreen.ts`

- [ ] **Step 1: 修改构造函数，延迟纹理层创建**

在 `MonitorScreen.ts` 中：

1. 构造函数中删除 `this.createTextureLayers()` 调用
2. 修改 `createEnclosingPlanes` 和 `createPerspectiveDimmer` 使用默认偏移（因为不再有纹理层的 maxOffset）
3. 新增 `addSmudgeLayer` 和 `addShadowLayer` 方法

构造函数改动：

```typescript
constructor() {
    super();
    this.application = new Application();
    this.scene = this.application.scene;
    this.cssScene = this.application.cssScene;
    this.sizes = this.application.sizes;
    this.resources = this.application.resources;
    this.screenSize = new THREE.Vector2(SCREEN_SIZE.w, SCREEN_SIZE.h);
    this.camera = this.application.camera;
    this.position = new THREE.Vector3(0, 950, 255);
    this.rotation = new THREE.Euler(-3 * THREE.MathUtils.DEG2RAD, 0, 0);
    this.mouseClickInProgress = false;
    this.shouldLeaveMonitor = false;
    this.textureLayersMaxOffset = 0;

    // Create screen (no texture layers yet)
    this.initializeScreenEvents();
    this.createIframe();
    this.createEnclosingPlanes(this.getDefaultMaxOffset());
    this.createPerspectiveDimmer(this.getDefaultMaxOffset());
}
```

新增默认偏移方法（替代纹理层提供的 maxOffset）：

```typescript
getDefaultMaxOffset(): number {
    const scaleFactor = 4;
    return 24 * scaleFactor; // 使用 smudge 层的偏移作为默认值
}
```

新增纹理层方法：

```typescript
private textureLayersMaxOffset: number;

addSmudgeLayer(texture: LoadedTexture) {
    const scaleFactor = 4;
    const offset = 24 * scaleFactor;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        opacity: 0,
        transparent: true,
    });

    const geometry = new THREE.PlaneGeometry(
        this.screenSize.width,
        this.screenSize.height
    );

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(
        this.offsetPosition(this.position, new THREE.Vector3(0, 0, offset))
    );
    mesh.rotation.copy(this.rotation);

    this.scene.add(mesh);

    // 淡入动画（使用 performance.now 避免依赖 Time 类）
    const startTime = performance.now();
    const fadeIn = () => {
        const progress = Math.min((performance.now() - startTime) / 500, 1);
        material.opacity = 0.12 * progress;
        if (progress < 1) {
            requestAnimationFrame(fadeIn);
        }
    };
    requestAnimationFrame(fadeIn);

    this.updateTextureLayersMaxOffset(offset);
}

addShadowLayer(texture: LoadedTexture) {
    const scaleFactor = 4;
    const offset = 5 * scaleFactor;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        opacity: 0,
        transparent: true,
    });

    const geometry = new THREE.PlaneGeometry(
        this.screenSize.width,
        this.screenSize.height
    );

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(
        this.offsetPosition(this.position, new THREE.Vector3(0, 0, offset))
    );
    mesh.rotation.copy(this.rotation);

    this.scene.add(mesh);

    // 淡入动画（使用 performance.now 避免依赖 Time 类）
    const startTime = performance.now();
    const fadeIn = () => {
        const progress = Math.min((performance.now() - startTime) / 500, 1);
        material.opacity = progress;
        if (progress < 1) {
            requestAnimationFrame(fadeIn);
        }
    };
    requestAnimationFrame(fadeIn);

    this.updateTextureLayersMaxOffset(offset);
}

updateTextureLayersMaxOffset(offset: number) {
    if (offset > this.textureLayersMaxOffset) {
        this.textureLayersMaxOffset = offset;
    }
}
```

删除原有的 `createTextureLayers` 方法（或保留但不在构造函数中调用）。新增的 `addSmudgeLayer` / `addShadowLayer` 各自独立创建自己的平面并淡入。

- [ ] **Step 2: 提交**

```bash
git add 3Dend/src/Application/World/MonitorScreen.ts
git commit -m "feat(3dend): lazy texture layers with fade-in for MonitorScreen"
```

---

### Task 9: 转换资源格式 + 删除孤儿文件

**Files:**
- Delete: `3Dend/static/textures/monitor/layers/compressed/reflection-compressed.png`
- Convert: `3Dend/static/textures/monitor/layers/compressed/smudges.jpg` → `smudges.webp`
- Convert: `3Dend/static/textures/monitor/layers/compressed/shadow-compressed.png` → `shadow-compressed.webp`
- Modify: `3Dend/src/Application/sources.ts` (更新 smudges 和 shadow-compressed 的扩展名)

- [ ] **Step 1: 删除孤儿文件**

```bash
rm 3Dend/static/textures/monitor/layers/compressed/reflection-compressed.png
```

- [ ] **Step 2: 转换 smudges.jpg → smudges.webp**

```bash
cd 3Dend/static/textures/monitor/layers/compressed
cwebp -q 85 smudges.jpg -o smudges.webp && rm smudges.jpg
```

> 如果系统没有 `cwebp`，可用 `ffmpeg -i smudges.jpg -quality 85 smudges.webp && rm smudges.jpg` 或在线转换后替换。

- [ ] **Step 3: 转换 shadow-compressed.png → shadow-compressed.webp**

```bash
cd 3Dend/static/textures/monitor/layers/compressed
cwebp -q 85 shadow-compressed.png -o shadow-compressed.webp && rm shadow-compressed.png
```

- [ ] **Step 4: 更新 sources.ts 中的文件扩展名**

修改 `3Dend/src/Application/sources.ts`，将两个路径改为 `.webp`：

```typescript
// monitorSmudgeTexture 的 path 改为：
path: 'textures/monitor/layers/compressed/smudges.webp',

// monitorShadowTexture 的 path 改为：
path: 'textures/monitor/layers/compressed/shadow-compressed.webp',
```

- [ ] **Step 5: 提交**

```bash
git add 3Dend/static/textures/ 3Dend/src/Application/sources.ts
git commit -m "perf(3dend): convert monitor textures to WebP, remove orphan file"
```

---

### Task 10: 修复 Nginx `/app/` 缓存头

**Files:**
- Modify: `nginx.web.conf`

- [ ] **Step 1: 修改 nginx.web.conf**

将 `/app/` 下静态资源的缓存头修复。使用 `map` 指令按扩展名动态添加缓存头：

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json application/pdf;

    # 按扩展名判断是否为静态资源
    map $uri $is_static_asset {
        ~*\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|pdf|mjs)$ 1;
        default 0;
    }

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;

        location = /robots.txt {
            proxy_pass http://backend:5000/robots.txt;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            access_log off;
        }

        location = /sitemap.xml {
            proxy_pass http://backend:5000/sitemap.xml;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            access_log off;
        }

        location ^~ /api/admin/ {
            proxy_pass http://backend:5000/api/admin/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            client_max_body_size 50M;
        }

        location ^~ /api/ {
            proxy_pass http://backend:5000/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            client_max_body_size 50M;
        }

        location ^~ /uploads/ {
            proxy_pass http://backend:5000/uploads/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            client_max_body_size 50M;
        }

        location /health {
            proxy_pass http://backend:5000/health;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            access_log off;
        }

        location ~* \.mjs$ {
            default_type application/javascript;
            expires 30d;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
        }

        location ^~ /articles/ {
            proxy_pass http://backend:5000/articles/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location = /app/.vite/manifest.json {
            alias /usr/share/nginx/html/app/.vite/manifest.json;
            add_header Cache-Control "no-cache";
            access_log off;
        }

        location ^~ /app/ {
            try_files $uri $uri/ /app/index.html;

            # 为 /app/ 下的静态资源添加缓存头
            if ($is_static_asset) {
                expires 30d;
                add_header Cache-Control "public, immutable";
            }
        }

        location / {
            try_files $uri $uri/ /index.html;
        }

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|pdf|mjs)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        location ~* \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }

        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
```

> 注意：`if` 在 `location` 块内是 Nginx 的"安全用法"之一（仅用于 `return` 和 `rewrite` 之外的检查时需谨慎）。这里用 `if ($is_static_asset)` 配合 `map` 是 Nginx 社区认可的模式。但更安全的替代方案是使用 `server` 级别的 `location` 拆分（将 `/app/assets/` 单独用一个 `location ~*` 处理）。实施时需要验证 Docker 内的 Nginx 版本是否支持 `map` + `if` 组合。

- [ ] **Step 2: 提交**

```bash
git add nginx.web.conf
git commit -m "fix(nginx): add cache headers for static assets under /app/"
```

---

### Task 11: 最终构建验证

- [ ] **Step 1: 运行 3Dend 测试**

```bash
cd 3Dend && npx jest --no-coverage
```

预期：所有测试通过。

- [ ] **Step 2: 运行 3Dend 构建**

```bash
cd 3Dend && npm run build
```

预期：构建成功，`dist/` 产出正确。

- [ ] **Step 3: 验证构建产物无残留**

```bash
ls 3Dend/dist/textures/monitor/layers/compressed/
```

预期：只有 `smudges.webp` 和 `shadow-compressed.webp`，无 `.jpg` / `.png`（reflection-compressed 已删除）。

```bash
ls 3Dend/dist/assets/
```

预期：有 JS 和 CSS bundle。

- [ ] **Step 4: 提交（如有修复）**

```bash
git add -A
git commit -m "chore: fix build issues found during verification"
```
