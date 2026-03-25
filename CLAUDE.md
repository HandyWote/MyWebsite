# CLAUDE.md

!!!回复请使用中文!!!
!!!使用项目中已有的组件，除非必要，不要另起炉灶!!!
don't edit code without my command
have to use superpower skill
采用TDD开发范式(REG)
在探讨方案时需要给我提供多个方案提供灵感，推荐未来技术债最低的方案

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Mode

In development mode, only the database runs in Docker (or locally), while backend and frontend run directly on the host.

### Backend (Go + Gin)
```bash
cd backend
go mod tidy                    # Install dependencies
go run main.go                 # Start dev server (port 5000)
go test ./...                  # Run all tests
go test ./routes -v            # Run specific package tests with verbose
go test -run TestName ./...    # Run specific test
```

### Frontend (React + Vite)
```bash
cd frontend
npm install                    # Install dependencies
npm run dev                    # Start dev server (port 3131)
npm run build                  # Build for production
npm run lint                   # Run ESLint
npm run test                   # Run Vitest tests
npm run test:run               # Run tests once (no watch)
```

### Service Communication
- **Frontend**: http://localhost:3131
- **Backend**: http://localhost:5000
- **Database**: PostgreSQL (external or Docker)

Vite proxy forwards `/api` and `/uploads` requests to backend automatically.

## Full Docker Deployment

```bash
docker-compose up -d           # Start all services
docker-compose logs -f backend # Monitor backend logs
docker-compose down            # Stop all services
```

## Architecture

### Tech Stack
- **Backend**: Go 1.25 + Gin + GORM + PostgreSQL
- **Frontend**: React 19 + Material-UI + Vite + Zustand
- **Deployment**: Docker Compose + Nginx

### Backend Structure
```
backend/
├── config/        # Configuration loading from .env
├── database/      # PostgreSQL connection
├── middleware/    # JWT auth, CORS
├── migrations/    # Database migrations
├── models/        # GORM models (Article, Comment, AISetting, etc.)
├── routes/        # Gin route handlers + route registration
├── services/      # Business logic (AI integration, file handling)
├── utils/         # Response helpers
└── main.go        # Entry point
```

### Frontend Structure
```
frontend/src/
├── admin/         # Admin dashboard components
├── components/    # Public-facing UI components
├── config/        # API configuration (axios setup)
├── hooks/         # Custom React hooks
├── theme/         # Material-UI theming
└── utils/         # Frontend utilities
```

### Key Patterns

**Configuration Flow:**
- Environment variables → `config/config.go` loads from `.env`
- AI settings: Database `ai_settings` table **overrides** environment variables (see `services/ai.go:getAIConfig`)
- Environment variable names: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_API_URL`

**Route Organization:**
- Public routes: `/api/*` (no auth required)
- Admin routes: `/api/admin/*` (JWT required via `middleware.JWTAuth`)
- Route registration in `routes/routes.go`

**Database Models (GORM):**
- `Article`, `Comment`, `Skill`, `Contact`, `Avatar`, `SiteBlock`, `AISetting`
- Auto-migration on startup via `main.go`

**Frontend API Calls:**
- Centralized in `frontend/src/config/api.js`
- Uses axios with base URL configuration

## Code Standards
- Backend: Go idiomatic style, camelCase for functions, PascalCase for exports
- Frontend: 2-space indentation, PascalCase for components, camelCase for utilities
