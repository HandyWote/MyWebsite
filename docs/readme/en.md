# MyWebsite

A personal website built with Go + React, featuring article management, skills showcase, contact forms, and comments.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go + Gin + GORM |
| Frontend | React 19 + Vite + MUI |
| Database | PostgreSQL + pgvector |
| Deployment | Docker Compose + Nginx |
| Communication | REST API |

## Quick Start

### Local Development

#### 1. Start Database (Docker)

```bash
docker-compose up -d
```

Only starts the PostgreSQL database. Backend and frontend run directly on the host.

#### 2. Start Backend

```bash
cd backend
go run main.go
# or with debug mode
go run main.go --debug
```

Backend runs at http://localhost:5000

#### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs at http://localhost:3131

#### Service Communication

- Frontend: http://localhost:3131
- Backend: http://localhost:5000
- Database: PostgreSQL runs in Docker

Frontend uses Vite proxy to automatically forward `/api` and `/uploads` requests to the backend (see `vite.config.js`), no CORS configuration needed.

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

After deployment, access via Nginx on port 4419.

## Project Structure

```
MyWebsite/
├── backend/                    # Go backend service
│   ├── config/                 # Configuration management
│   │   └── config.go
│   ├── database/              # Database connection
│   │   └── database.go
│   ├── middleware/             # Middleware
│   │   └── middleware.go
│   ├── models/                 # Data models
│   │   └── models.go
│   ├── routes/                 # API routes
│   │   ├── admin_article.go    # Article management
│   │   ├── admin_comment_extra.go
│   │   ├── admin_extra.go
│   │   ├── admin_siteblock.go
│   │   ├── ai.go              # AI analysis
│   │   ├── article.go         # Article endpoints
│   │   ├── auth.go            # Authentication
│   │   ├── category_tag.go    # Categories and tags
│   │   ├── comment.go         # Comment endpoints
│   │   ├── public.go          # Public endpoints
│   │   ├── routes.go          # Route registration
│   │   ├── system.go          # System endpoints
│   │   └── export_import.go   # Import/Export
│   ├── services/              # Business logic
│   ├── uploads/               # Uploaded files directory
│   ├── utils/                 # Utility functions
│   ├── tests/                 # Backend tests
│   ├── main.go               # Entry point
│   ├── go.mod                # Go dependencies
│   ├── go.sum
│   └── .env                  # Environment configuration
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── admin/            # Admin dashboard
│   │   ├── components/      # Public components
│   │   ├── config/          # API configuration
│   │   ├── hooks/           # Custom hooks
│   │   ├── theme/           # MUI theme
│   │   ├── utils/           # Utility functions
│   │   ├── App.jsx          # Main application
│   │   ├── main.jsx         # Entry point
│   │   └── index.css
│   ├── public/              # Static assets
│   ├── dist/                # Build output
│   ├── package.json
│   ├── vite.config.js
│   ├── vitest.config.js
│   ├── nginx.conf           # Nginx configuration
│   └── Dockerfile
│
├── docs/                      # Documentation
│   └── readme/              # README documents
│
├── logs/                      # Log directory
├── docker-compose.yml         # Docker orchestration
├── README.md                  # Project documentation
├── CLAUDE.md                 # AI development guide
└── AGENTS.md                 # Agent instructions
```

## API Endpoints

### Public API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/articles | Get article list |
| GET | /api/articles/:id | Get article details |
| GET | /api/articles/:id/comments | Get article comments |
| POST | /api/articles/:id/comments | Submit comment |
| GET | /api/categories | Get category list |
| GET | /api/tags | Get tag list |
| GET | /api/site-blocks | Get site blocks |
| GET | /api/skills | Get skills list |
| GET | /api/contacts | Get contact information |
| GET | /api/avatars | Get avatar list |
| GET | /health | Health check |
| GET | /robots.txt | Robots protocol |
| GET | /sitemap.xml | Sitemap |

### Admin API

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/login | Admin login |
| POST | /api/admin/logout | Admin logout |
| GET | /api/admin/verify | Verify login status |
| GET | /api/admin/auth/me | Get current user |
| GET | /api/admin/site-blocks | Get site blocks |
| POST | /api/admin/site-blocks | Create site block |
| PUT | /api/admin/site-blocks | Batch update site blocks |
| DELETE | /api/admin/site-blocks/:id | Delete site block |
| GET | /api/admin/skills | Get skills list |
| POST | /api/admin/skills | Create skill |
| PUT | /api/admin/skills/:id | Update skill |
| DELETE | /api/admin/skills/:id | Delete skill |
| GET | /api/admin/contacts | Get contacts |
| POST | /api/admin/contacts | Create contact |
| PUT | /api/admin/contacts/:id | Update contact |
| DELETE | /api/admin/contacts/:id | Delete contact |
| GET | /api/admin/avatars | Get avatar list |
| POST | /api/admin/avatars | Upload avatar |
| PUT | /api/admin/avatars/:id/set_current | Set current avatar |
| DELETE | /api/admin/avatars/:id | Delete avatar |
| GET | /api/admin/articles | Get article list (admin) |
| GET | /api/admin/articles/:id | Get article details (admin) |
| POST | /api/admin/articles | Create article |
| PUT | /api/admin/articles/:id | Update article |
| DELETE | /api/admin/articles/:id | Delete article |
| POST | /api/admin/articles/batch-delete | Batch delete articles |
| POST | /api/admin/articles/cover | Upload cover image |
| POST | /api/admin/articles/pdf/upload | Upload PDF |
| POST | /api/admin/articles/import-md | Import Markdown |
| POST | /api/admin/articles/ai-analyze | AI analyze article content |
| POST | /api/admin/articles/:id/analyze | AI analyze specific article |
| GET | /api/admin/comments | Get comment list |
| GET | /api/admin/comments/export | Export comments |
| GET | /api/admin/comments/limits | Get comment limits config |
| DELETE | /api/admin/comments/:id | Delete comment |
| PUT | /api/admin/comments/:id | Update comment status |
| PUT | /api/admin/comments/:id/status | Update comment status |
| GET | /api/admin/ai-settings | Get AI settings |
| PUT | /api/admin/ai-settings | Update AI settings |
| POST | /api/admin/ai-settings/test | Test AI configuration |
| GET | /api/admin/export | Export data |
| POST | /api/admin/import | Import data |
| GET | /api/admin/stats | Get statistics |

## Testing

### Backend Tests

```bash
cd backend
go test ./...
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm run test

# Run tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage
```

### Frontend Linting

```bash
cd frontend
npm run lint
```

## Environment Variables

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | host.docker.internal | Database host |
| DB_PORT | 5432 | Database port |
| DB_USER | postgres | Database username |
| DB_PASSWORD | password | Database password |
| DB_NAME | mywebsite | Database name |

### Security Configuration

| Variable | Description |
|----------|-------------|
| SECRET_KEY | Application secret key |
| JWT_SECRET_KEY | JWT secret key |

### Admin Account

| Variable | Default | Description |
|----------|---------|-------------|
| ADMIN_USERNAME | admin | Admin username |
| ADMIN_PASSWORD | admin123 | Admin password |

### Upload Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| UPLOAD_FOLDER | uploads | Upload folder |
| MAX_CONTENT_LENGTH | 5242880 | Max content length (5MB) |
| ALLOWED_IMAGE_EXTENSIONS | jpg,jpeg,png,webp | Allowed image extensions |

### OpenAI Configuration (Optional)

| Variable | Description |
|----------|-------------|
| OPENAI_API_KEY | OpenAI API key |
| OPENAI_MODEL | OpenAI model, default gpt-3.5-turbo |

### JWT Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| JWT_ACCESS_TOKEN_EXPIRES | 86400 | Access token expiry (seconds) |
| JWT_REMEMBER_TOKEN_EXPIRES | 604800 | Remember me token expiry (seconds) |

### Comment Limit Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| COMMENT_LIMIT_ENABLED | true | Enable comment limits |
| COMMENT_LIMIT_TIME_WINDOW | 24 | Time window (hours) |
| COMMENT_LIMIT_MAX_COUNT | 1 | Max comments in time window |
| COMMENT_LIMIT_EXEMPT_ADMIN | true | Admin exempt from limits |

## License

MIT License
