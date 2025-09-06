# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern personal website project named "HandyWote" with a frontend-backend architecture:
- Frontend: React 18 + Vite with Material-UI components
- Backend: Flask (Python) with PostgreSQL database
- Features: Personal showcase, article management, skill display, admin dashboard
- Deployment: Docker + Docker Compose with Nginx

## Common Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### Backend Development
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start development server
python app.py

# Or use the setup script
python setup.py
```

### Docker Development
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Build images
docker-compose build
```

## Code Architecture

### Frontend Structure
- `src/admin/` - Admin dashboard components
- `src/components/` - Public UI components
- `src/config/` - API configuration and settings
- `src/hooks/` - Custom React hooks
- `src/theme/` - Material-UI theme configuration
- `src/utils/` - Utility functions

API configuration is centralized in `src/config/api.js` which handles environment-based URL construction.

### Backend Structure
- `routes/` - API endpoint definitions
- `models/` - Database models (SQLAlchemy)
- `services/` - Business logic implementations
- `utils/` - Helper functions
- `extensions.py` - Flask extension initializations
- `setup.py` - Environment setup and database initialization

The backend uses a factory pattern with `create_app()` function in `app.py`.

### Key Configurations

#### Environment Variables
Frontend (.env.local):
```
VITE_API_BASE_URL=http://localhost:5000/
```

Backend (.env):
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=mywebsite
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production
```

#### API Configuration
The frontend uses a centralized API configuration system in `src/config/api.js` that:
1. Dynamically sets API base URL based on environment variables
2. Defines all API endpoints in one place
3. Provides helper functions for URL construction

#### Database
- PostgreSQL is used as the primary database
- SQLAlchemy ORM for database operations
- Database initialization handled in `setup.py`

## Deployment Information

### Production URLs
- Frontend: https://www.handywote.site
- Backend API: https://webbackend.handywote.site

### Docker Deployment
The application is containerized with Docker:
- Backend service runs on port 5000
- Uses Gunicorn with gevent workers in production
- Uploads directory is mounted as a volume

### Nginx Configuration
Nginx is used as a reverse proxy for:
- SSL termination with Let's Encrypt certificates
- Static file serving
- Load balancing