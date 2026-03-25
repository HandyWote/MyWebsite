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
