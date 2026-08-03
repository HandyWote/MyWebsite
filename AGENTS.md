# Repository Guidelines

# Top Rules
1. think about reuse

## Project Structure & Module Organization

This repository contains a personal website split into three main areas:

- `backend/`: Go 1.25 Gin/GORM API, routes, middleware, migrations, models, and service code.
- `frontend/`: React 19 + Vite application. Source lives in `frontend/src`, with admin UI under `src/admin`, shared UI under `src/components`, state stores under `src/stores`, and config/utilities under `src/config` and `src/utils`.
- `3Dend/`: separate Vite/Three.js TypeScript experience, with app code in `3Dend/src` and Jest tests in `3Dend/tests`.
- `docs/`: readme translations and planning/design notes.

Static assets are kept near their owning app, such as `frontend/public` and `3Dend/static`.

## Build, Test, and Development Commands

- `docker-compose up -d --build`: build and run the full site, exposed at `http://localhost:4419`.
- `cd backend && go run main.go`: start the API locally on port `5000`.
- `cd backend && go test ./...`: run all backend unit and route tests.
- `cd frontend && npm run dev`: start the Vite frontend dev server.
- `cd frontend && npm run build`: create a production frontend build.
- `cd frontend && npm run lint`: run ESLint.
- `cd frontend && npm run test:run`: run Vitest once.
- `cd 3Dend && npm run dev` / `npm run build`: develop or build the 3D app.

## Coding Style & Naming Conventions

Use existing file patterns when adding modules. Go code should be formatted with `gofmt`; package names are lowercase and tests use `_test.go`. Frontend code uses ES modules, React components in PascalCase, hooks prefixed with `use`, and test files beside source as `*.test.jsx` or `*.test.js`. ESLint is configured for browser JavaScript/JSX, React Hooks, and React Refresh.

## Testing Guidelines

Backend tests use Go’s test runner plus `testify`; add focused tests near changed packages. Frontend tests use Vitest with jsdom and Testing Library; matching files are `frontend/src/**/*.{test,spec}.{js,jsx}`. Coverage is available with `npm run test:coverage`. The 3D app uses Jest with `ts-jest` and `tests/*.test.ts`.

## Commit & Pull Request Guidelines

Recent history follows conventional-style messages such as `feat(routes): ...`, `refactor(routes): ...`, `test(routes): ...`, `docs: ...`, and `chore: ...`. Keep commits scoped and imperative. Pull requests should describe the change, list verification commands run, link related issues or plans, and include screenshots for visible UI changes.

## Security & Configuration Tips

Copy environment templates before local runs: `backend/.env.example` and `frontend/.env.example`. Do not commit secrets. Production deployments must override default admin, JWT, and application secret values.
