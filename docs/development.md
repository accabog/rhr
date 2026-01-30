# Development Guide

This guide covers local development setup, debugging, and testing.

## Development Environment

### Prerequisites

- Python 3.12+
- Node.js 20+ with npm
- PostgreSQL 16 (or Docker)
- Redis 7 (or Docker)
- Git

### Recommended IDE Setup

**VS Code Extensions:**
- Python (ms-python.python)
- Pylance (ms-python.vscode-pylance)
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- TypeScript Vue Plugin (Vue.volar) - if using Vue

**PyCharm:**
- Enable Django support
- Configure Python interpreter to use virtual environment
- Set up JavaScript language version to ES2022

## Backend Development

### Initial Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies (including dev tools)
pip install -e ".[dev]"

# Set up environment
export DATABASE_URL=postgres://rhr:rhr_dev_password@localhost:5432/rhr
export REDIS_URL=redis://localhost:6379/0
export DJANGO_SETTINGS_MODULE=config.settings.local
export SECRET_KEY=dev-secret-key

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

### Project Structure

```
backend/
├── config/                 # Django configuration
│   ├── settings/
│   │   ├── base.py         # Base settings
│   │   ├── local.py        # Development settings
│   │   └── production.py   # Production settings
│   ├── urls.py             # Root URL configuration
│   └── celery.py           # Celery configuration
├── apps/                   # Django applications
│   ├── core/               # Base models, utilities
│   ├── tenants/            # Multi-tenancy
│   ├── users/              # Authentication
│   ├── employees/          # Employee management
│   ├── timetracking/       # Time entries
│   ├── timesheets/         # Period summaries
│   ├── leave/              # PTO management
│   └── contracts/          # Employment contracts
└── tests/                  # Test files
```

### Code Style

We use **Ruff** for linting and formatting:

```bash
# Check for issues
ruff check .

# Fix auto-fixable issues
ruff check --fix .

# Format code
ruff format .
```

### Type Checking

We use **mypy** for static type checking:

```bash
mypy apps --ignore-missing-imports
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=apps --cov-report=html

# Run specific test file
pytest apps/employees/tests/test_views.py

# Run with verbose output
pytest -v

# Run matching test name
pytest -k "test_create_employee"
```

### Database Migrations

```bash
# Create new migration
python manage.py makemigrations app_name

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Revert migration
python manage.py migrate app_name 0001
```

### Django Shell

```bash
# Start shell with IPython (if installed)
python manage.py shell

# Or use shell_plus from django-extensions
python manage.py shell_plus
```

## Frontend Development

### Initial Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variable
export VITE_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```

### Project Structure

```
frontend/
├── src/
│   ├── api/                # API client and hooks
│   │   ├── client.ts       # Axios instance
│   │   └── *.ts            # API modules
│   ├── features/           # Feature modules
│   │   ├── auth/           # Authentication
│   │   ├── employees/      # Employee management
│   │   ├── timetracking/   # Time tracking
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   ├── layouts/            # Page layouts
│   ├── stores/             # Zustand stores
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
├── public/                 # Static assets
└── tests/                  # Test files
```

### Code Style

We use **ESLint** and **Prettier**:

```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code (if configured)
npx prettier --write src/
```

### Type Checking

```bash
# Run TypeScript compiler
npx tsc --noEmit

# With specific config
npx tsc --noEmit -p tsconfig.build.json
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test -- --watch

# Run E2E tests
npm run test:e2e
```

### Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Debugging

### Backend Debugging

**Using print statements:**
```python
import logging
logger = logging.getLogger(__name__)
logger.debug("Debug message")
```

**Using Django Debug Toolbar:**
Already configured in local settings. Visit any page to see the debug panel.

**Using pdb:**
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

## Common Tasks

### Adding a New API Endpoint

1. Create or update model in `apps/<app>/models.py`
2. Create serializer in `apps/<app>/serializers.py`
3. Create or update ViewSet in `apps/<app>/views.py`
4. Register routes in `apps/<app>/urls.py`
5. Add tests in `apps/<app>/tests/`

### Adding a New Frontend Feature

1. Create feature folder in `src/features/<feature>/`
2. Add API functions in `src/api/<feature>.ts`
3. Create components in the feature folder
4. Add routes in `src/App.tsx`
5. Add tests in `src/features/<feature>/__tests__/`

### Updating Dependencies

**Backend:**
```bash
# Update all packages
pip install --upgrade -e ".[dev]"

# Update specific package
pip install --upgrade package_name
```

**Frontend:**
```bash
# Check for updates
npm outdated

# Update all packages
npm update

# Update specific package
npm install package_name@latest
```

## Pre-commit Hooks

Consider setting up pre-commit hooks for consistent code quality:

```bash
pip install pre-commit
pre-commit install
```

Example `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.6
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```
