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
| pytest-benchmark | latest | Performance benchmarks |
| ESLint | latest | JavaScript/TypeScript linting |
| Prettier | latest | Code formatting |
| Playwright | latest | E2E and visual regression testing |
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
| `make test` | Run all unit tests |
| `make test-be` | Run backend tests only |
| `make test-fe` | Run frontend tests only |
| `make test-e2e` | Run E2E tests (Playwright) |
| `make test-e2e-ui` | Run E2E tests with UI |
| `make test-cov` | Backend tests with coverage report |
| `make test-bench` | Run performance benchmarks |

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

### Docker-in-Docker Volume Mount Issues

When running inside the Dev Container, `make up` may fail with volume mount errors. This is a known Docker-in-Docker limitation where container paths don't resolve correctly for volume mounts.

**Workaround:** Run database services via Docker, but run application services natively:

```bash
# Start only database services
docker compose up -d db redis

# Run backend natively (in one terminal)
cd backend && python manage.py runserver

# Run frontend natively (in another terminal)
cd frontend && npm run dev
```

This is the recommended pattern for Dev Container development - the container provides development tools (Python, Node, linters) while database services run in their own containers.

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

## E2E Testing

End-to-end tests use [Playwright](https://playwright.dev/) to test the full application stack.

### Running E2E Tests

```bash
# Run all E2E tests
make test-e2e

# Run with UI (interactive mode)
make test-e2e-ui

# Run specific test file
cd frontend && npx playwright test e2e/auth.spec.ts

# Debug a failing test
cd frontend && npx playwright test --debug
```

### E2E Test Data

E2E tests require seeded test data. The `seed_e2e_data` command creates:

- Test user: `e2e-test@example.com` / `TestPassword123!`
- Test tenant: `e2e-test`
- Basic organizational structure (department, position, employee)

```bash
# Seed E2E test data (run before E2E tests locally)
make seed-e2e
```

### Writing E2E Tests

E2E tests are located in `frontend/e2e/`. Use the auth helper for login:

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/my-page');
    await expect(page.getByText('Expected Text')).toBeVisible();
  });
});
```

## Visual Regression Testing

Visual regression tests capture screenshots and compare them against baseline images to detect unintended UI changes.

### Running Visual Tests

```bash
# Run visual regression tests
cd frontend && npx playwright test e2e/visual.spec.ts

# Update baseline snapshots after intentional UI changes
cd frontend && npx playwright test e2e/visual.spec.ts --update-snapshots
```

### Baseline Images

Baseline screenshots are stored in `frontend/e2e/visual.spec.ts-snapshots/` and should be committed to the repository. They are platform-specific (e.g., `dashboard-chromium-linux.png`).

### When to Update Baselines

Update baseline images when:
- Making intentional UI changes
- Adding new visual tests
- Updating dependencies that affect rendering (fonts, UI library)

```bash
# Generate new baselines
npm run test:e2e:update-snapshots e2e/visual.spec.ts

# Commit the updated snapshots
git add frontend/e2e/visual.spec.ts-snapshots/
git commit -m "chore: update visual regression baselines"
```

## Performance Benchmarks

API performance benchmarks use [pytest-benchmark](https://pytest-benchmark.readthedocs.io/) to measure endpoint response times.

### Running Benchmarks

```bash
# Run all benchmarks
make test-bench

# Run with detailed output
cd backend && pytest tests/benchmarks/ -v --benchmark-only

# Save benchmark results to JSON
cd backend && pytest tests/benchmarks/ --benchmark-json=benchmark.json
```

### Writing Benchmarks

Benchmarks are located in `backend/tests/benchmarks/`:

```python
import pytest

pytestmark = [pytest.mark.django_db, pytest.mark.benchmark]

class TestMyAPIPerformance:
    def test_endpoint_performance(self, benchmark, authenticated_tenant_client):
        result = benchmark(
            authenticated_tenant_client.get,
            '/api/v1/my-endpoint/'
        )
        assert result.status_code == 200
```

## CI/CD Pipeline

The CI pipeline (`.github/workflows/ci.yml`) runs on every push and pull request.

### Pipeline Features

| Feature | Description |
|---------|-------------|
| **Path Filtering** | Only runs backend/frontend jobs when relevant files change |
| **Migration Check** | Fails if model changes lack migrations |
| **Bundle Size Tracking** | Warns if JS bundle exceeds 600KB |
| **E2E Tests** | Full integration tests with Playwright |
| **Visual Regression** | Screenshot comparison tests |
| **Parallel Docker Builds** | Backend and frontend images built concurrently |
| **PR Comments** | Automatic CI status summary on pull requests |

### CI Jobs

```
┌─────────────────┐
│  Detect Changes │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌──────────┐
│Backend│ │ Frontend │
└───┬───┘ └────┬─────┘
    │          │
    └────┬─────┘
         ▼
    ┌─────────┐
    │  E2E    │
    └────┬────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Docker  │ │Docker  │
│Backend │ │Frontend│
└────────┘ └────────┘
```

### Maintenance Workflow

A weekly maintenance workflow (`.github/workflows/maintenance.yml`) runs every Monday:

- Checks for outdated Python dependencies (pip-audit)
- Checks for outdated npm dependencies (npm-check-updates)
- Runs performance benchmarks to establish baselines
- Creates GitHub issues for dependency updates

### PR Preview Deployments

When `PREVIEW_ENABLED=true` is set in repository variables, the PR preview workflow (`.github/workflows/pr-preview.yml`) deploys preview environments for each pull request.

## Seeding Data

### Development Data

For local development with realistic demo data:

```bash
make seed
```

This creates:
- 3 demo tenants (US, DE, GB configurations)
- 3 demo users per tenant (admin, manager, employee)
- ~25 employees per tenant with full HR data
- Leave requests, time entries, contracts, etc.

**Demo credentials:**
- `admin@demo.com` / `demo123!` (owner)
- `manager@demo.com` / `demo123!` (manager)
- `employee@demo.com` / `demo123!` (employee)

### E2E Test Data

For E2E testing with minimal data:

```bash
make seed-e2e
```

This creates only what's needed for E2E tests to pass.
