# 清理 Webpack 残留并统一构建输出目录 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 删除所有 Webpack 相关配置和依赖，将 Vite 构建输出目录从 `public/` 改为 `dist/`，确保项目构建和测试正常通过。

**Architecture:** 移除 `bundler/` 目录和 webpack 相关依赖，修改 vite 配置的 outDir，更新测试和文档以反映新的目录结构。

**Tech Stack:** Vite, TypeScript, Jest

---

### Task 1: 更新 vite.config.ts 输出目录

**Files:**
- Modify: `vite.config.ts`

**Step 1: 修改 outDir 配置**

将 `outDir: 'public'` 改为 `outDir: 'dist'`：

```typescript
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'static',
  resolve: {
    alias: {
      three: path.resolve(projectRoot, 'node_modules/three'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
```

**Step 2: 验证配置语法**

Run: `npx tsc --noEmit vite.config.ts`
Expected: 无错误输出（或忽略 module resolution 错误）

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "chore: 将构建输出目录从 public 改为 dist"
```

---

### Task 2: 更新 .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: 修改忽略目录**

将 `public/` 改为 `dist/`：

```
node_modules
package-lock.json
.DS_Store
*.psd

dist/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: 更新 .gitignore 忽略 dist 目录"
```

---

### Task 3: 更新构建测试

**Files:**
- Modify: `tests/build.test.ts`

**Step 1: 更新目录变量和测试描述**

```typescript
/**
 * Build Verification Test
 * Verify production build completes and outputs expected artifacts.
 */

import { spawnSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Build System', () => {
  const projectRoot = join(__dirname, '..');
  const viteCli = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  const distDir = join(projectRoot, 'dist');
  const assetsDir = join(distDir, 'assets');

  test('Vite 生产构建成功完成', () => {
    const result = spawnSync(process.execPath, [viteCli, 'build'], {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 300000, // 5 minutes timeout
    });

    expect(result.status).toBe(0);

    // Verify build output exists
    expect(existsSync(distDir)).toBe(true);
  });

  test('构建产物包含 index.html', () => {
    const indexPath = join(distDir, 'index.html');
    expect(existsSync(indexPath)).toBe(true);
  });

  test('构建产物包含 JS bundle', () => {
    const rootFiles = readdirSync(distDir);
    const rootJsFiles = rootFiles.filter(f => f.endsWith('.js'));
    const assetJsFiles = existsSync(assetsDir)
      ? readdirSync(assetsDir).filter(f => f.endsWith('.js'))
      : [];
    const jsFiles = [...rootJsFiles, ...assetJsFiles];
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  test('构建产物契约满足发布目录结构', () => {
    const hasIndexHtml = existsSync(join(distDir, 'index.html'));
    const rootJsFiles = readdirSync(distDir).filter(entry => entry.endsWith('.js'));
    const assetJsFiles = existsSync(assetsDir)
      ? readdirSync(assetsDir).filter(entry => entry.endsWith('.js'))
      : [];
    const hasJsBundle = [...rootJsFiles, ...assetJsFiles].length > 0;
    const expectedStaticDirs = ['models', 'images', 'draco'];

    expect(hasIndexHtml).toBe(true);
    expect(hasJsBundle).toBe(true);

    expectedStaticDirs.forEach(dirName => {
      const dirPath = join(distDir, dirName);
      expect(existsSync(dirPath)).toBe(true);
      expect(statSync(dirPath).isDirectory()).toBe(true);
    });
  });

  test('默认脚本已切换到 Vite 且不保留 Webpack 回退脚本', () => {
    const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    expect(pkg.scripts.build).toContain('vite build');
    expect(pkg.scripts.dev).toBe('vite');
    expect(pkg.scripts['webpack:build']).toBeUndefined();
    expect(pkg.scripts['webpack:dev']).toBeUndefined();
  });
});
```

**Step 2: 运行测试验证**

Run: `npm test -- tests/build.test.ts`
Expected: 4 tests pass (构建相关测试需要先运行 build)

如果失败，先运行: `npm run build`

**Step 3: Commit**

```bash
git add tests/build.test.ts
git commit -m "test: 更新构建测试使用 dist 目录"
```

---

### Task 4: 更新 CLAUDE.md 文档

**Files:**
- Modify: `CLAUDE.md`

**Step 1: 更新构建输出说明**

找到 `Production build outputs to public/.` 改为 `Production build outputs to dist/.`：

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## TOP RULES
must use superpower
use TDD(REG)
reploy in chinese
always give me some plan and i love lower tech-debt resolution
just discuss with me, dont eddit the code without my accept

## Overview

This is a Three.js 3D portfolio scene focused on:
- mouse-driven camera movement
- office/computer model rendering
- monitor iframe display (`MonitorScreen`)

Removed features:
- loading screen and UI overlays
- audio system
- contact form server API
- screen noise shader overlay

## Tech Stack

- **3D**: Three.js + CSS3DRenderer + GLTFLoader
- **Bundler**: Vite
- **Language**: TypeScript

## Commands

```bash
npm run dev    # vite dev server
npm run build  # production build -> dist/
npm start      # same as dev
```

## Architecture

### Core Application

`Application.ts` orchestrates scenes, camera, renderer, resources, and world updates.

### Rendering

```
scene -> WebGLRenderer -> #webgl
cssScene -> CSS3DRenderer -> #css
```

### World Objects

`World.ts` creates these after resources are ready:
- `Environment`
- `Decor`
- `ComputerSetup`
- `MonitorScreen`

### Resource Loading

`Resources.ts` loads only:
- `gltfModel`
- `texture`
- `cubeTexture`

## Key Files

- `src/script.ts` - app entry
- `src/Application/Application.ts` - orchestrator
- `src/Application/World/World.ts` - world object composition
- `src/Application/World/MonitorScreen.ts` - iframe monitor integration
- `src/Application/Utils/Resources.ts` - asset loading
- `src/Application/sources.ts` - resource manifest

## Build Output

Production build outputs to `dist/`.
# currentDate
Today's date is 2026-03-25.
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: 更新 CLAUDE.md 构建输出目录为 dist"
```

---

### Task 5: 更新 buildspec.yaml

**Files:**
- Modify: `buildspec.yaml`

**Step 1: 指定构建输出目录**

AWS CodeBuild 需要明确指定输出目录：

```yaml
version: 0.2

phases:
    install:
        commands:
            - npm install
    build:
        commands:
            - npm run build

artifacts:
    base-directory: dist
    files:
        - '**/*'
```

**Step 2: Commit**

```bash
git add buildspec.yaml
git commit -m "ci: 更新 buildspec.yaml 构建输出目录为 dist"
```

---

### Task 6: 清理 package.json 中的 Webpack 相关依赖和脚本

**Files:**
- Modify: `package.json`

**Step 1: 移除 Webpack 相关依赖**

需要移除的依赖（dependencies 中）：
- @babel/core, @babel/preset-env, @babel/preset-react (babel 相关)
- babel-loader
- clean-webpack-plugin
- copy-webpack-plugin
- css-loader
- html-loader
- html-webpack-plugin
- ip
- mini-css-extract-plugin
- portfinder-sync
- style-loader
- ts-loader
- webpack
- webpack-cli
- webpack-dev-server
- webpack-merge

需要保留的依赖：
- @tweenjs/tween.js
- @types/tweenjs
- bezier-easing
- camera-controls
- three
- typescript

需要移除的 devDependencies：
- @babel/preset-typescript

需要保留的 devDependencies：
- @types/jest
- @types/react
- @types/three
- jest
- vite
- ts-jest

**Step 2: 清理 npm scripts**

移除冗余的 vite 别名脚本，保持简洁：

```json
{
    "scripts": {
        "start": "vite preview",
        "build": "vite build",
        "dev": "vite"
    }
}
```

**Step 3: 完整的 package.json**

```json
{
    "repository": "#",
    "license": "UNLICENSED",
    "scripts": {
        "start": "vite preview",
        "build": "vite build",
        "dev": "vite"
    },
    "dependencies": {
        "@tweenjs/tween.js": "^18.6.4",
        "@types/tweenjs": "^1.0.4",
        "bezier-easing": "^2.1.0",
        "camera-controls": "^1.34.2",
        "three": "^0.137.5",
        "typescript": "^4.6.2"
    },
    "devDependencies": {
        "@types/jest": "^29.5.14",
        "@types/react": "^17.0.43",
        "@types/three": "^0.138.0",
        "jest": "^29.7.0",
        "vite": "^6.0.0",
        "ts-jest": "^29.2.5"
    }
}
```

**Step 4: 重新安装依赖**

Run: `rm -rf node_modules package-lock.json && npm install`
Expected: 成功安装精简后的依赖

**Step 5: 验证构建**

Run: `npm run build`
Expected: 构建成功，输出到 dist/

**Step 6: 运行测试**

Run: `npm test`
Expected: 所有测试通过

**Step 7: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: 移除 webpack 相关依赖，精简 package.json"
```

---

### Task 7: 删除 bundler 目录

**Files:**
- Delete: `bundler/` 目录

**Step 1: 删除目录**

Run: `rm -rf bundler/`

**Step 2: 验证删除**

Run: `ls -la`
Expected: bundler 目录不存在

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: 删除 webpack 配置目录 bundler/"
```

---

### Task 8: 删除 babel 配置文件

**Files:**
- Delete: `.babelrc`

**Step 1: 检查是否有 .babelrc**

Run: `ls -la .babelrc`
Expected: 文件存在

**Step 2: 删除文件**

Run: `rm .babelrc`

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: 删除 .babelrc，不再需要 babel"
```

---

### Task 9: 删除旧的 public 目录

**Files:**
- Delete: `public/` 目录

**Step 1: 删除目录**

Run: `rm -rf public/`

**Step 2: 验证删除**

Run: `ls -la`
Expected: public 目录不存在，dist 目录将在下次构建时生成

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: 删除旧的 public 构建输出目录"
```

---

### Task 10: 最终验证

**Step 1: 完整构建测试**

Run: `npm run build`
Expected: 构建成功，dist/ 目录生成

**Step 2: 运行所有测试**

Run: `npm test`
Expected: 所有测试通过

**Step 3: 验证目录结构**

Run: `ls -la dist/`
Expected: 包含 index.html, assets/, models/, images/, textures/ 等

**Step 4: 本地运行验证**

Run: `npm run dev`
Expected: 开发服务器正常启动，页面可访问

---

## 预期结果

1. `bundler/` 目录已删除
2. `public/` 目录已删除（构建后生成 `dist/`）
3. `.babelrc` 已删除
4. `package.json` 依赖从约 35 个减少到约 11 个
5. 所有测试通过
6. 构建和开发服务器正常运行
