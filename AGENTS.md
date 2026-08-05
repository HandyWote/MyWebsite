# Repository Guidelines

# Top Rules

1. think about reuse

## Project Structure & Module Organization

This repository contains a personal website split into these main areas:

- `backend/`: Go 1.25 Gin/GORM API, routes, middleware, migrations, models, repositories, storage, and service code.
- `frontend/`: Next.js 16 App Router application with React 19, MUI, and Three.js. Routes live in `frontend/app`, public/admin UI and shared runtime code live in `frontend/src`, and 3D assets live in `frontend/public/3d`.
- `docs/`: readme translations and planning/design notes.

Static assets are kept near the owning app, primarily under `frontend/public`.

## Build, Test, and Development Commands

- `docker-compose up -d --build`: build and run the full site, exposed at `http://localhost:4419`.
- `cd backend && go run main.go`: start the API locally on port `5000`.
- `cd backend && go test ./...`: run all backend unit and route tests.
- `cd frontend && npm run dev`: start the Next frontend dev server.
- `cd frontend && npm run build`: create a production frontend build.
- `cd frontend && npm run lint`: run ESLint.
- `cd frontend && npm run test:run`: run Vitest once.
- `cd frontend && npm run test:e2e`: run Playwright browser checks for the public 3D experience.

## Coding Style & Naming Conventions

Use existing file patterns when adding modules. Go code should be formatted with `gofmt`; package names are lowercase and tests use `_test.go`. Frontend code uses ES modules, React components in PascalCase, hooks prefixed with `use`, and test files beside source as `*.test.jsx` or `*.test.js`. ESLint is configured for browser JavaScript/JSX, React Hooks, and React Refresh.

## Testing Guidelines

Backend tests use Go’s test runner plus `testify`; add focused tests near changed packages. Frontend tests use Vitest with jsdom and Testing Library; matching files are `frontend/**/*.{test,spec}.{js,jsx,ts,tsx}`. Coverage is available with `npm run test:coverage`. Browser coverage uses Playwright under `frontend/e2e`.

## Commit & Pull Request Guidelines

Recent history follows conventional-style messages such as `feat(routes): ...`, `refactor(routes): ...`, `test(routes): ...`, `docs: ...`, and `chore: ...`. Keep commits scoped and imperative. Pull requests should describe the change, list verification commands run, link related issues or plans, and include screenshots for visible UI changes.

## Security & Configuration Tips

Copy environment templates before local runs: `.env.example`, `backend/.env.example`, and `frontend/.env.example`. Do not commit secrets. Production deployments must override default admin, JWT, revalidation, and application secret values.
