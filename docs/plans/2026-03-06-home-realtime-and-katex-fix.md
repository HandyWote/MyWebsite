# Home Realtime and KaTeX Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the broken KaTeX CDN stylesheet and make the home page subscribe to the correct Socket.IO namespaces.

**Architecture:** Keep the existing local KaTeX CSS imports and stop duplicating them in `index.html`. Reuse the existing `socket.io-client` setup pattern already used by admin components, but apply it to the home page with one socket per namespace so emitted events line up with backend namespaces.

**Tech Stack:** Vite, React 19, Vitest, Testing Library, Socket.IO client

---

### Task 1: Lock the broken HTML dependency down with a test

**Files:**
- Create: `frontend/src/appShell.test.js`
- Modify: `frontend/index.html`
- Test: `frontend/src/appShell.test.js`

**Step 1: Write the failing test**

Assert that `index.html` does not include the jsDelivr KaTeX stylesheet link.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/appShell.test.js`
Expected: FAIL because `frontend/index.html` still contains the CDN stylesheet.

**Step 3: Write minimal implementation**

Remove the KaTeX CDN `<link>` from `frontend/index.html`.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/appShell.test.js`
Expected: PASS

### Task 2: Lock home-page namespace wiring down with a test

**Files:**
- Create: `frontend/src/components/Home.test.jsx`
- Modify: `frontend/src/components/Home.jsx`
- Test: `frontend/src/components/Home.test.jsx`

**Step 1: Write the failing test**

Render `Home`, advance timers, and assert `socket.io-client` is called with:
- `${getApiUrl.websocket()}/site_blocks`
- `${getApiUrl.websocket()}/skills`
- `${getApiUrl.websocket()}/contacts`
- `${getApiUrl.websocket()}/avatars`

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/Home.test.jsx`
Expected: FAIL because `Home` currently creates only one default-namespace socket.

**Step 3: Write minimal implementation**

Update `Home.jsx` to create and clean up one socket per backend namespace, reusing the existing event handlers.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/Home.test.jsx`
Expected: PASS

### Task 3: Regression verification

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/components/Home.jsx`
- Test: `frontend/src/appShell.test.js`
- Test: `frontend/src/components/Home.test.jsx`

**Step 1: Run targeted tests**

Run: `npm run test:run -- src/appShell.test.js src/components/Home.test.jsx`
Expected: PASS

**Step 2: Run lint for touched frontend code**

Run: `npm run lint`
Expected: PASS or only pre-existing unrelated warnings
