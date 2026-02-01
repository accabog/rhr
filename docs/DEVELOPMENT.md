# Development Environment Setup

This document explains how to set up your development environment for Raptor HR.

## Quick Start

```bash
# Start all services
make up

# Check status
make status

# View logs
make logs
```

## Prerequisites

- **Docker** (v20+) with Docker Compose v2
- **VS Code** (recommended) with Dev Containers extension
- **Git**

## Option 1: Dev Container (Recommended)

The Dev Container provides a fully configured development environment with all tools pre-installed.

### What's Included

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.12 | Backend development |
| Node.js | 20.x | Frontend development |
| ruff | latest | Python linting/formatting |
| mypy | latest | Python type checking |
| pytest | latest | Python testing |
| ESLint | latest | JavaScript/TypeScript linting |
| Prettier | latest | Code formatting |
| PostgreSQL client | latest | Database access |
| Redis CLI | latest | Cache debugging |

### VS Code Extensions (Auto-installed)

- Python + Pylance (IntelliSense)
- Ruff (linting)
- ESLint + Prettier (JS/TS)
- GitLens (git history)
- SQLTools (database browser)
- Thunder Client (API testing)

### Setup Steps

1. **Install Prerequisites**
   ```bash
   # Install VS Code Dev Containers extension
   code --install-extension ms-vscode-remote.remote-containers
   ```

2. **Open in Dev Container**
   - Open the project in VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Select "Dev Containers: Reopen in Container"
   - Wait for the container to build (~3-5 minutes first time)

3. **Start Services**
   ```bash
   make up
   ```

4. **Verify Setup**
   ```bash
   # Backend
   make test-be

   # Frontend
   make test-fe
   ```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Machine                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │       Dev Container (VS Code runs here)           │   │
│  │  • Python 3.12 + ruff, mypy, pytest              │   │
│  │  • Node 20 + eslint, prettier, typescript        │   │
│  │  • Backend deps installed (for autocomplete)     │   │
│  │  • Frontend deps installed (for TypeScript)      │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │ network                       │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Application Services                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│   │
│  │  │postgres │ │  redis  │ │ backend │ │frontend ││   │
│  │  │  :5432  │ │  :6379  │ │  :8000  │ │  :3000  ││   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘│   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Option 2: Native Development

If you prefer not to use Dev Containers, install tools locally:

### Backend Setup

```bash
# Install Python 3.12
pyenv install 3.12
pyenv local 3.12

# Create virtual environment
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -e ".[dev]"

# Start services (postgres, redis)
make up

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

### Frontend Setup

```bash
# Install Node.js 20
nvm install 20
nvm use 20

# Install dependencies
cd frontend
npm ci

# Start dev server
npm run dev
```

## Makefile Commands

All commands are run from the project root.

### Services

| Command | Description |
|---------|-------------|
| `make up` | Start all Docker services |
| `make down` | Stop all services |
| `make restart` | Restart all services |
| `make logs` | Follow service logs |
| `make status` | Show service status |

### Backend Development

| Command | Description |
|---------|-------------|
| `make migrate` | Run Django migrations |
| `make migrations` | Create new migrations |
| `make shell` | Open Django shell (shell_plus) |
| `make seed` | Seed development data |

### Testing

| Command | Description |
|---------|-------------|
| `make test` | Run all tests |
| `make test-be` | Run backend tests only |
| `make test-fe` | Run frontend tests only |
| `make test-cov` | Backend tests with coverage report |

### Code Quality

| Command | Description |
|---------|-------------|
| `make lint` | Run all linters |
| `make lint-be` | Run backend linter (ruff) |
| `make lint-fe` | Run frontend linter (eslint) |
| `make format` | Format all code |

### Database

| Command | Description |
|---------|-------------|
| `make db-shell` | Open PostgreSQL shell |
| `make redis-cli` | Open Redis CLI |

### Docker

| Command | Description |
|---------|-------------|
| `make build` | Rebuild all containers |
| `make clean` | Remove containers and volumes |

## Environment Variables

### Backend (.env or environment)

```bash
DJANGO_SETTINGS_MODULE=config.settings.local
DATABASE_URL=postgres://rhr:rhr_dev_password@db:5432/rhr
REDIS_URL=redis://redis:6379/0
DEBUG=true
SECRET_KEY=your-secret-key-here
```

### Frontend

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

## Common Issues

### Docker Compose Not Found

If you see "docker-compose not found", use `docker compose` (v2 syntax) instead. The Makefile handles this automatically.

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8000

# Kill the process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Check if postgres is running
make status

# Restart services
make restart

# Check logs
make logs
```

### Dev Container Won't Start

1. Ensure Docker is running
2. Check Docker has enough resources (4GB+ RAM recommended)
3. Try rebuilding: `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"

## Claude Code Integration

### Custom Skills

The project includes custom Claude Code skills:

- `/migrate` - Generate and run Django migrations
- `/add-api` - Scaffold a new API endpoint with tests
- `/add-feature` - Create a new frontend feature module

### Hooks

Automatic linting runs before commits via `.claude/settings.json`.

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api/v1/ |
| API Docs | http://localhost:8000/api/docs/ |
| Admin | http://localhost:8000/admin/ |
