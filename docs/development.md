# Development Environment Setup

This document explains how to set up your development environment for Raptor HR.

## Quick Start

**VS Code Dev Container (recommended):**
```bash
# Start db/redis in Docker, backend/frontend natively
make dev
```

**Native Docker (outside Dev Container):**
```bash
# Start all services in Docker
make up

# Check status
make status

# View logs
make logs
```

## Prerequisites

- **Docker** (v20+) with Docker Compose v2
  - **WSL2 users**: Use [Docker Desktop](https://www.docker.com/products/docker-desktop/) with WSL2 integration enabled (Settings → Resources → WSL Integration). Do NOT install Docker inside WSL2 as it conflicts with Docker Desktop.
  - **Native Linux**: Install Docker via `./scripts/setup-ubuntu.sh` or your package manager.
- **VS Code** (recommended) with Dev Containers extension
- **Git**

## Option 1: Dev Container (Recommended)

The Dev Container provides a fully configured development environment with all tools pre-installed. It uses [Dev Container Features](https://containers.dev/features) for automatic tool installation and updates.

### What's Included

**Installed via Dev Container Features (auto-updating):**

| Feature | Version | Purpose |
|---------|---------|---------|
| Python | 3.12 | Backend development |
| Node.js | 20.x | Frontend development |
| Docker CLI | latest | Container management from inside Dev Container |
| GitHub CLI | latest | GitHub operations (`gh pr`, `gh issue`, etc.) |

**Installed via Dockerfile (system packages only):**

| Tool | Purpose |
|------|---------|
| ripgrep (`rg`) | Fast code search |
| fd | Fast file finder |
| PostgreSQL client | Database access |
| Redis CLI | Cache debugging |
| Playwright deps | System libraries for E2E browser testing |

**Installed via postCreateCommand (runs after Features):**

| Tool | Purpose |
|------|---------|
| uv | Fast Python package manager (10-100x faster than pip) |
| ruff, mypy, ipython, httpie, rich | Python dev tools |
| @anthropic-ai/claude-code, typescript | Node global tools |
| Backend deps | Django, pytest, etc. (via `uv sync`) |
| Frontend deps | React, ESLint, Prettier (via `npm ci`) |
| Playwright browsers | Chromium for E2E tests |

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
   - Wait for the container to build (~1-2 minutes first time)

3. **Start Services**
   ```bash
   make dev
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
│  │  Base: mcr.microsoft.com/devcontainers/base       │   │
│  │  Features: Python 3.12, Node 20, Docker, gh CLI  │   │
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

### Dev Container Features

The Dev Container uses [Features](https://containers.dev/features) to declaratively install tools. This provides:
- **Faster builds**: Pre-built feature layers are cached and reused
- **Automatic updates**: Features are maintained by the community
- **Simpler Dockerfile**: Only ~35 lines for system packages

**Build order**: Dockerfile → Features → postCreateCommand

This means the Dockerfile can only install system packages (apt). Python/Node tools must be installed in `postCreateCommand` since Features provide Python and Node.

Current features (defined in `.devcontainer/devcontainer.json`):
```jsonc
"features": {
  "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
  "ghcr.io/devcontainers/features/node:1": { "version": "20" },
  "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {},
  "ghcr.io/devcontainers/features/github-cli:1": {},
  "ghcr.io/devcontainers/features/common-utils:2": { "installZsh": false }
}
```

## Option 2: Native Development

If you prefer not to use Dev Containers, install tools locally.

### Quick Setup (Ubuntu 24.04)

Run the automated setup script to install all development tools:

```bash
./scripts/setup-ubuntu.sh
```

This installs:
- Python 3.12 (via pyenv)
- uv (fast Python package manager)
- Node.js 20 (via nvm)
- Docker and Docker Compose v2
- Development tools (ripgrep, fd, GitHub CLI)
- Playwright browser dependencies

Options:
- `--skip-docker` - Skip Docker installation
- `--skip-playwright` - Skip Playwright browser dependencies
- `--help` - Show usage information

After running the script, open a new terminal or run `source ~/.bashrc` to activate the new tools.

### Manual Setup

For other Linux distributions, macOS, or Windows, install the tools manually.

### Backend Setup

```bash
# Install Python 3.12
pyenv install 3.12
pyenv local 3.12

cd backend

# Install dependencies using uv (recommended - 10-100x faster)
uv sync

# Or using pip (traditional method)
# python -m venv .venv
# source .venv/bin/activate  # or .venv\Scripts\activate on Windows
# pip install -e ".[dev]"

# Start services (postgres, redis)
make up

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

### uv Commands Reference

| Old (pip) | New (uv) | Purpose |
|-----------|----------|---------|
| `pip install -e ".[dev]"` | `uv sync` | Install all deps from lock file |
| `pip install package` | `uv add package` | Add new dependency |
| `pip uninstall package` | `uv remove package` | Remove dependency |
| `pip list` | `uv pip list` | List installed packages |

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

### Frontend npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run test:e2e:debug` | Run E2E tests in debug mode |
| `npm run test:e2e:update-snapshots` | Update visual regression baselines |

### IDE Setup

**VS Code Extensions:**
- Python (ms-python.python)
- Pylance (ms-python.vscode-pylance)
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Ruff (charliermarsh.ruff)

**PyCharm:**
- Enable Django support
- Configure Python interpreter to use virtual environment
- Set up JavaScript language version to ES2022

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

### Dev Container (Recommended for VS Code Dev Container)

| Command | Description |
|---------|-------------|
| `make dev` | Start db/redis + run backend/frontend natively (Ctrl+C stops all) |
| `make dev-services` | Start only PostgreSQL and Redis |
| `make run-be` | Run backend natively (for separate terminal) |
| `make run-fe` | Run frontend natively (for separate terminal) |

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
| `make refresh-frontend` | Rebuild frontend with fresh node_modules |

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

All documentation uses `docker compose` (v2 syntax). The Makefile also uses v2 syntax.

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

### Verify Dev Container Tools

After rebuilding the Dev Container, verify tools are installed correctly:

```bash
python --version    # 3.12.x
uv --version        # uv x.x.x
node --version      # v20.x
docker --version    # Docker CLI available
gh --version        # GitHub CLI available
rg --version        # ripgrep
fd --version        # fd
```

### Docker Desktop WSL2 Build Errors

If you see credential helper errors when building:
```
fork/exec /usr/bin/docker-credential-desktop.exe: exec format error
```

This happens when switching from apt-installed Docker to Docker Desktop. Fix by clearing the old config:

```bash
echo '{}' > ~/.docker/config.json
```

### Frontend "Cannot find package" Errors

If the frontend container fails with missing package errors after adding new dependencies:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'some-package'
```

The anonymous `node_modules` volume is stale. Refresh it:

```bash
make refresh-frontend
```

This rebuilds the frontend image and recreates the container with a fresh volume.

### Docker-in-Docker Volume Mount Issues

When running inside the Dev Container, `make up` may fail with volume mount errors. This is a known Docker-in-Docker limitation where container paths don't resolve correctly for volume mounts.

**Solution:** Use `make dev` which starts database services via Docker and runs application services natively:

```bash
# Start everything in one command (Ctrl+C to stop all)
make dev
```

This starts:
- PostgreSQL and Redis in Docker containers
- Django backend natively (http://localhost:8000)
- Vite frontend natively (http://localhost:3000)

**Alternative:** Run services in separate terminals for independent log viewing:

```bash
# Terminal 1: Start database services
make dev-services

# Terminal 2: Run backend
make run-be

# Terminal 3: Run frontend
make run-fe
```

This is the recommended pattern for Dev Container development - the container provides development tools (Python, Node, linters) while database services run in their own containers.

## Debugging

### Backend Debugging

**Using logging:**
```python
import logging
logger = logging.getLogger(__name__)
logger.debug("Debug message")
```

**Using Django Debug Toolbar:**
Already configured in local settings. Visit any page to see the debug panel.

**Using pdb/ipdb:**
```python
import pdb; pdb.set_trace()
# or with IPython
import ipdb; ipdb.set_trace()
```

**VS Code launch.json:**
```json
{
  "name": "Django",
  "type": "python",
  "request": "launch",
  "program": "${workspaceFolder}/backend/manage.py",
  "args": ["runserver", "--noreload"],
  "django": true
}
```

### Frontend Debugging

**React Developer Tools:**
Install the browser extension for React component inspection.

**TanStack Query DevTools:**
Open browser DevTools and look for the "React Query" tab to inspect query state, cache, and refetch triggers.

**VS Code launch.json:**
```json
{
  "name": "Chrome",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

## Management Commands

### sync_holidays

Sync national holidays from the Nager.Date API for all tenants or a specific tenant.

```bash
# Sync holidays for all tenants (current + next year)
python manage.py sync_holidays

# Sync for a specific tenant
python manage.py sync_holidays --tenant=acme

# Sync a specific country
python manage.py sync_holidays --country=US

# Sync specific years
python manage.py sync_holidays --year=2025 --year=2026

# Combine options
python manage.py sync_holidays --tenant=acme --country=DE --year=2025
```

## Media Files

### Upload Paths

| Content Type | Upload Path | Description |
|--------------|-------------|-------------|
| Tenant Logos | `media/tenant_logos/` | Full organization logos |
| Tenant Icons | `media/tenant_logos/icons/` | Compact sidebar icons |
| User Avatars | `media/avatars/` | User profile pictures |
| Employee Avatars | `media/employee_avatars/` | Employee profile pictures |
| Documents | `media/documents/%Y/%m/` | Uploaded documents (organized by date) |

In local development, media files are served by Django's development server. In production, media files should be served by Nginx or a CDN.

## Claude Code Integration

### MCP Servers

MCP (Model Context Protocol) servers extend Claude Code with additional capabilities. This project includes pre-configured servers that are automatically set up in the Dev Container.

#### Available Servers

| Server | Runner | Purpose | Example Prompts |
|--------|--------|---------|-----------------|
| **github** | http | PR reviews, issue management | "Review PR #123", "List open issues" |
| **postgres** | npx | Natural language DB queries | "What's the schema?", "Show recent employees" |
| **filesystem** | npx | Enhanced file browsing | Browse project directories with context |
| **redis** | uvx | Cache inspection, key management | "What keys are in Redis?", "Show cached sessions" |
| **playwright** | npx | Browser automation, E2E debugging | "Open login page", "Take a screenshot" |
| **memory** | npx | Persistent knowledge across sessions | "Remember this uses DRF", "What do you know?" |
| **fetch** | docker | HTTP requests, API testing | "Fetch the health endpoint", "Test login API" |
| **time** | uvx | Timezone conversions, date calculations | "What time in Berlin?", "Convert 3pm EST to UTC" |
| **aws** | uvx | AWS resource management | Disabled by default - enable when needed |
| **context7** | npx | Up-to-date library documentation | "Get React 19 docs", "Show Django 5.0 guide" |
| **sequential-thinking** | npx | Structured problem-solving | "Think through auth flow step by step" |

#### Verification

After the Dev Container starts, verify MCP servers:
```bash
claude /mcp
```

You should see all configured servers listed (aws will show as disabled).

#### How It Works

1. `.mcp.json` defines the server configurations
2. `.devcontainer/mcp-setup.sh` pre-installs dependencies during container creation
3. Claude Code automatically loads the configuration when started

#### Server Details

**Core Infrastructure:**
- `github` - Uses GitHub's hosted MCP endpoint (OAuth on first use)
- `postgres` - Uses `@bytebase/dbhub` for natural language SQL queries
- `redis` - Uses `redis-mcp-server` to inspect cache state

**Development & Testing:**
- `playwright` - Browser automation for E2E test debugging and visual inspection
- `fetch` - Runs in isolated Docker container for safe HTTP requests
- `filesystem` - Enhanced navigation within `/workspace`

**Utilities:**
- `memory` - Store and recall context across Claude Code sessions
- `time` - Timezone conversions and date calculations
- `aws` - AWS resource management (disabled by default for security)
- `context7` - Fetches up-to-date documentation for libraries and frameworks
- `sequential-thinking` - Enables structured, step-by-step problem-solving and reasoning

#### Enabling AWS Server

The AWS server is disabled by default. To enable it:

1. Ensure AWS credentials are configured (`~/.aws/credentials` or environment variables)
2. Edit `.mcp.json` and set `"disabled": false` for the aws server
3. Set `AWS_PROFILE` environment variable if using named profiles
4. Restart Claude Code

#### Personal Overrides

To add your own MCP servers without modifying the shared config:
1. Create `.mcp.json.local` in the project root
2. Add your custom configurations (same format as `.mcp.json`)
3. This file is gitignored

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
