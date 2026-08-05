# MyWebsite

A personal website built with a Go API, a Next.js frontend, server-rendered SEO content, and a desktop Three.js public experience.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Go 1.25 + Gin + GORM |
| Frontend | Next.js 16 App Router + React 19 + MUI |
| 3D Experience | Three.js integrated in `frontend/src/three` |
| Database | PostgreSQL + pgvector |
| Deployment | Docker Compose: edge Nginx, Next standalone, Go API |
| Communication | REST API and internal Next revalidation events |

## Local Development

Start the backend:

```bash
cd backend
go run main.go
```

Start the frontend:

```bash
cd frontend
npm ci
npm run dev
```

Default local services:

| Service | URL |
| --- | --- |
| Backend API | `http://localhost:5000` |
| Next frontend | `http://localhost:3000` |
| Docker edge | `http://localhost:4419` |

Browser API calls stay relative to `/api`. Next Server Components and rewrites use `BACKEND_INTERNAL_URL`.

## Docker Deployment

```bash
docker compose up -d --build
docker compose logs -f backend next-web edge-nginx
docker compose down
```

The production topology is:

```text
edge-nginx:4419
  -> next-web:3000 for public pages, admin pages, robots and sitemap
  -> backend:5000 for /api, /uploads and /health
```

`/internal/*` is not exposed through edge Nginx. Backend revalidation calls should use `NEXT_REVALIDATION_URL=http://next-web:3000/internal/revalidate` and the shared `REVALIDATION_TOKEN`.

## Project Structure

```text
MyWebsite/
├── backend/              # Go API, repositories, services, storage, migrations
├── frontend/
│   ├── app/              # Next App Router routes
│   ├── e2e/              # Playwright browser checks
│   ├── public/           # Public assets, including /3d
│   └── src/              # Admin UI, public components, API helpers, Three runtime
├── docs/                 # Documentation and plans
├── docker-compose.yml    # edge-nginx + next-web + backend topology
├── nginx.edge.conf       # edge reverse proxy
└── AGENTS.md             # Repository instructions
```

## API Surface

Public API served by Go:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/articles` | Article list |
| GET | `/api/articles/:id` | Article details |
| GET | `/api/articles/:id/comments` | Article comments |
| POST | `/api/articles/:id/comments` | Submit comment |
| GET | `/api/categories` | Categories |
| GET | `/api/tags` | Tags |
| GET | `/api/site-blocks` | Public site blocks |
| GET | `/api/avatars` | Avatar list |
| GET | `/api/avatars/file/*key` | Avatar media |
| GET | `/api/articles/pdf/*key` | Article PDF media |
| GET | `/health` | Backend health |

SEO routes are served by Next:

| Path | Owner |
| --- | --- |
| `/` | Next |
| `/articles` | Next |
| `/articles/:id` | Next |
| `/projects` | Next |
| `/robots.txt` | Next |
| `/sitemap.xml` | Next |

## Verification

Backend:

```bash
cd backend
go test ./...
go vet ./...
```

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
```

## Configuration

Copy and edit environment templates before deployment:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Production deployments must replace every placeholder in the environment templates, including administrator login, signing values, revalidation auth, database, public origin, and storage/S3 settings.
