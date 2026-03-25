# Safe Vite Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the current Webpack-based portfolio site to Vite with zero functional regressions and a one-command rollback path.

**Architecture:** Keep runtime app code unchanged (`src/Application/**`) and replace only build/tooling layers first. Migrate in thin vertical slices: tests first, then dual-build compatibility, then switch defaults. Preserve `public/` as final artifact directory to avoid deployment changes.

**Tech Stack:** TypeScript, Three.js, Jest/ts-jest, Webpack 5, Vite 6+, Rollup under Vite.

---

### Task 1: Baseline Snapshot and Safety Branch

**Files:**
- Modify: `package.json`
- Test: `tests/build.test.ts`

**Step 1: Write the failing test**

Add a new test in `tests/build.test.ts` that captures current build contract (artifact path + required files):

```ts
test('构建产物 contract: public 目录含 index.html 与静态资源目录', () => {
  const publicDir = join(projectRoot, 'public');
  expect(existsSync(join(publicDir, 'index.html'))).toBe(true);
  const files = readdirSync(publicDir);
  expect(files.some(f => f.endsWith('.js'))).toBe(true);
  expect(files.includes('models') || files.includes('images') || files.includes('draco')).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest tests/build.test.ts -v`
Expected: FAIL if contract test is stricter than current assertions.

**Step 3: Write minimal implementation**

Adjust only assertions so they reflect current real output without overfitting hash names.

**Step 4: Run test to verify it passes**

Run: `npx jest tests/build.test.ts -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/build.test.ts package.json
git commit -m "test: lock down build artifact contract before vite migration"
```

### Task 2: Introduce Vite in Parallel (No Default Switch)

**Files:**
- Create: `vite.config.ts`
- Create: `index.html`
- Modify: `package.json`
- Modify: `src/script.ts`
- Test: `tests/build.test.ts`

**Step 1: Write the failing test**

Extend `tests/build.test.ts` with a Vite-specific build smoke test:

```ts
test('vite production build completes', () => {
  const result = spawnSync('npx', ['vite', 'build'], {
    cwd: projectRoot,
    stdio: 'pipe',
    timeout: 300000,
    shell: true,
  });
  expect(result.status).toBe(0);
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest tests/build.test.ts -v`
Expected: FAIL because `vite.config.ts` and `index.html` entry are not ready.

**Step 3: Write minimal implementation**

1. Add `vite.config.ts` with:
- `root: '.'`
- `publicDir: 'static'`
- `build.outDir: 'public'`
- `build.emptyOutDir: true`
- `resolve.alias` for `three`

2. Create root `index.html` loading `/src/script.ts`.
3. In `src/script.ts`, replace direct CSS import behavior only if needed for Vite entry (`import './style.css'` stays valid).
4. Add scripts without replacing existing ones:
- `vite:dev`: `vite`
- `vite:build`: `vite build`
- `vite:preview`: `vite preview`

**Step 4: Run test to verify it passes**

Run: `npx jest tests/build.test.ts -v`
Expected: PASS for both Webpack and Vite build tests.

**Step 5: Commit**

```bash
git add vite.config.ts index.html package.json src/script.ts tests/build.test.ts
git commit -m "build: add vite in parallel with webpack"
```

### Task 3: Dev Server Parity Checks (Manual + Automated)

**Files:**
- Modify: `tests/build.test.ts`
- Test: `src/Application/World/World.ts`

**Step 1: Write the failing test**

Add a URL/asset resolution check in Jest by asserting built HTML references a JS module and static assets survive copy semantics.

```ts
test('vite build emits html + module entry', () => {
  const html = readFileSync(join(projectRoot, 'public', 'index.html'), 'utf8');
  expect(html).toMatch(/<script[^>]*type="module"/);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run vite:build && npx jest tests/build.test.ts -v`
Expected: FAIL if HTML shape/path assumptions wrong.

**Step 3: Write minimal implementation**

Adjust Vite config for base/assets behavior only (avoid app logic changes), e.g. `base: './'` if deployment requires relative paths.

**Step 4: Run test to verify it passes**

Run: `npm run vite:build && npx jest tests/build.test.ts -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add vite.config.ts tests/build.test.ts
git commit -m "test: verify vite output html and asset wiring"
```

### Task 4: Controlled Default Switch

**Files:**
- Modify: `package.json`
- Modify: `readme.md`
- Test: `tests/build.test.ts`

**Step 1: Write the failing test**

Add script contract test:

```ts
test('npm run build uses vite by default', () => {
  const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
  expect(pkg.scripts.build).toContain('vite build');
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest tests/build.test.ts -v`
Expected: FAIL before script switch.

**Step 3: Write minimal implementation**

Update scripts:
- `dev` -> `vite`
- `build` -> `vite build`
- Keep `webpack:dev` / `webpack:build` for rollback window (at least one release cycle).

Update `readme.md` to document both paths and rollback command.

**Step 4: Run test to verify it passes**

Run:
- `npx jest -v`
- `npm run build`

Expected: PASS and successful production build.

**Step 5: Commit**

```bash
git add package.json readme.md tests/build.test.ts
git commit -m "chore: switch default scripts to vite with webpack fallback"
```

### Task 5: Rollback Plan and Decommission Criteria

**Files:**
- Modify: `readme.md`
- Create: `docs/plans/2026-03-25-vite-rollback-checklist.md`

**Step 1: Write the failing test**

Create a checklist validation test (or CI step) asserting rollback scripts exist:

```ts
test('rollback scripts are present', () => {
  const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
  expect(pkg.scripts['webpack:build']).toBeDefined();
  expect(pkg.scripts['webpack:dev']).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest tests/build.test.ts -v`
Expected: FAIL if rollback scripts missing.

**Step 3: Write minimal implementation**

Add rollback checklist doc:
- Trigger conditions (broken prod build, asset 404, runtime bootstrap failure)
- Rollback command: `npm run webpack:build`
- Verification: `public/index.html` + JS bundle + static assets.

**Step 4: Run test to verify it passes**

Run: `npx jest tests/build.test.ts -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add readme.md docs/plans/2026-03-25-vite-rollback-checklist.md tests/build.test.ts
git commit -m "docs: add vite rollback checklist and keep webpack fallback"
```

### Task 6: Final Cleanup (Delayed, Optional)

**Files:**
- Delete: `bundler/webpack.common.js`
- Delete: `bundler/webpack.dev.js`
- Delete: `bundler/webpack.prod.js`
- Modify: `package.json`
- Test: `tests/build.test.ts`

**Step 1: Write the failing test**

Add expectation that legacy webpack scripts are removed only when migration is stable.

**Step 2: Run test to verify it fails**

Run: `npx jest tests/build.test.ts -v`
Expected: FAIL while scripts still exist.

**Step 3: Write minimal implementation**

Remove webpack config/scripts only after at least one stable release period.

**Step 4: Run test to verify it passes**

Run:
- `npx jest -v`
- `npm run build`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove webpack after successful vite stabilization window"
```

---

## Operational Safety Rules

1. Never switch default scripts and remove Webpack in the same commit.
2. Keep output dir as `public/` during migration to avoid deployment drift.
3. Keep rollback scripts for one release cycle minimum.
4. Every migration task must be reversible with a single commit revert.
5. CI gate must run `npx jest -v` and `npm run build` before merge.
