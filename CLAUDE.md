# CLAUDE.md

!!!回复请使用中文!!!
!!!尽量使用项目中已有的组件，除非必要，不要另起炉灶!!!

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Mode (Currently Used)

In development mode, only the database runs in Docker, while the backend and frontend run directly on the host:

### Database (Docker Only)
```bash
docker-compose up -d              # Start PostgreSQL database only
```

### Backend Development
```bash
cd backend
uv sync                           # Install dependencies using uv package manager
uv run app.py --debug             # Start development server (port 5000)
uv run test_ai.py                 # Test AI service configuration
```

### Frontend Development
```bash
cd frontend
npm install                       # Install dependencies
npm run dev                       # Start dev server (port 3131)
npm run build                     # Build for production
npm run lint                      # Run ESLint
npm run preview                   # Preview production build
```

### Service Communication
- **Frontend**: http://localhost:3131
- **Backend**: http://localhost:5000
- **Database**: PostgreSQL runs in Docker

The frontend uses Vite proxy to automatically forward `/api`, `/socket.io`, and `/uploads` requests to the backend (see `vite.config.js` lines 27-68), no CORS configuration needed.

## Full Docker Deployment

### Quick Start with Docker
```bash
docker-compose up -d              # Start all services
```

### Monitoring
```bash
docker-compose logs -f backend    # Monitor backend logs
docker-compose logs -f frontend   # Monitor frontend logs
docker-compose down               # Stop all services
```

## Testing

### Backend Tests
```bash
cd backend
uv run test_ai.py                 # Test AI service configuration
```

### Frontend Tests
```bash
# Frontend API configuration test
cd frontend && node src/config/api.test.js
```

docker-compose logs -f backend    # Monitor backend logs

## High-Level Architecture

### Service Architecture
The project uses a microservices architecture with Docker Compose orchestration:

```
User Browser → Nginx (port 4419) → Frontend/Backend Services
                              ↓
                    PostgreSQL Database
```

**Service Communication:**
- **Frontend** (port 4419): Nginx serves static files and proxies API calls to backend
- **Backend** (port 5000): Flask API, internal Docker network only (not exposed to host)
- **Database**: PostgreSQL with pgvector extension for potential AI features
- **WebSocket**: Real-time communication via Socket.IO through Nginx proxy

### Code Organization

**Backend Structure (Flask + SQLAlchemy):**
- `backend/models/`: SQLAlchemy data models (Article, Skill, Contact, Comment, etc.)
- `backend/routes/`: API route blueprints organized by feature
- `backend/services/`: Business logic including AI integration and file handling
- `backend/utils/`: Utility functions for common operations
- `backend/config.py`: Configuration management with environment variable support

**Frontend Structure (React + Material-UI):**
- `frontend/src/admin/`: Admin dashboard components and management interfaces
- `frontend/src/components/`: Public-facing UI components
- `frontend/src/config/`: API configuration and WebSocket setup
- `frontend/src/hooks/`: Custom React hooks
- `frontend/src/theme/`: Material-UI theming and styling
- `frontend/src/utils/`: Frontend utility functions

### Key Design Patterns

**Authentication:** JWT-based with refresh tokens, configured in `backend/config.py`

**API Communication:** Frontend uses Axios with centralized configuration in `frontend/src/config/api.js`

**Real-time Updates:** Socket.IO integration for live data updates, configured in both backend and frontend

**File Management:** Uploads handled through backend with storage in `backend/uploads/`, served via Nginx

**Configuration Management:** Environment-based configuration using `.env` files, with Docker environment detection for path resolution

**Database Design:** PostgreSQL with SQLAlchemy ORM, includes models for articles, skills, contacts, comments, and site content blocks

### Development Workflow

**Adding New Features:**
1. Backend: Create/modify models in `backend/models/`, add routes in `backend/routes/`, implement business logic in `backend/services/`
2. Frontend: Create components in appropriate directories, update API calls in `frontend/src/config/api.js`
3. Test: Run backend tests with `python test_ai.py` and frontend tests as needed

**Common Modifications:**
- API endpoints: Update both backend routes and frontend API configuration
- Environment variables: Modify `backend/.env` and ensure Docker Compose picks up changes
- UI styling: Use Material-UI theme system in `frontend/src/theme/`

**Code Standards:**
- Backend: PEP 8 compliance, snake_case for modules/functions, PascalCase for models
- Frontend: 2-space indentation, PascalCase for React components, camelCase for utilities