# Repository Guidelines
!!!回复请使用中文!!!
!!!尽量使用项目中已有的组件，除非必要，不要另起炉灶!!!
## Project Structure & Module Organization
- `backend/` hosts the Flask API: `models/` for SQLAlchemy entities, `routes/` for blueprints, `services/` for cross-cutting logic, and `config.py` + `.env` for runtime parameters.
- `frontend/` is Vite + React 19; components live in `src/components/`, admin dashboards in `src/admin/`, with networking and sockets centralized under `src/config/`.
- `docker-compose.yml` wires backend, frontend (via Nginx), PostgreSQL, and Socket.IO; change ports or env vars here rather than editing source files.

## Build, Test, and Development Commands
```bash
docker-compose up -d              # build & run the whole stack
docker-compose logs -f backend    # tail a service

cd backend && uv pip install -e . && python app.py --debug
python backend/test_ai.py         # checks OpenAI config + services.ai

cd frontend && npm install
npm run dev && npm run lint
npm run build && npm run preview
```

## Coding Style & Naming Conventions
- Backend: follow PEP 8, 4-space indents, snake_case modules, PascalCase models, and SCREAMING_SNAKE_CASE config keys. Keep queries in `models/` or dedicated service helpers.
- Frontend: 2-space indents (see `src/main.jsx`), PascalCase React components, camelCase hooks/utilities, and environment-specific values exported from `src/config/api.js`.

## Testing Guidelines
- Backend regression check is `python backend/test_ai.py`; add more `test_*.py` scripts so contributors can run them directly without extra tooling.
- Frontend smoke tests live in `frontend/src/config/api.test.js`; run `node src/config/api.test.js` whenever API endpoints or ports change and mirror the `*.test.js` naming for new checks.
- Document any manual verification (e.g., `docker-compose up -d` + hitting `/admin`) in your PR until automated coverage grows.

## Commit & Pull Request Guidelines
- Use the Conventional Commits style already in history (`feat(frontend): …`, `fix(api): …`, `docs: …`), keeping scopes aligned with top-level folders.
- PRs should explain the problem, summarize the solution, link issues, include screenshots for UI changes, and list the commands you ran (`npm run lint`, `python backend/test_ai.py`, Docker smoke).
- Squash fixups locally and ensure CI (or manual test evidence) is green before requesting review.

## Security & Configuration Tips
- Copy `backend/.env.example` to `.env`, never commit secrets, and rotate `SECRET_KEY`, `JWT_SECRET_KEY`, and database credentials per environment; note new env vars in the PR.
- Update both `frontend/src/config/api.js` and the CORS list in `backend/app.py` when backend URLs or ports move to avoid browser preflight failures.
- Store uploads inside `backend/uploads` and ensure Docker volume permissions are updated if you introduce new storage paths.
