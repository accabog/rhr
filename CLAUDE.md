# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raptor HR (RHR) is a multi-tenant HR platform with a React frontend and Django REST Framework backend. Multi-tenancy uses a shared database with `tenant_id` foreign keys on all tenant-scoped models.

## Common Commands

### Development (Dev Container - Recommended)
```bash
make dev              # Start db/redis + backend/frontend (Ctrl+C stops all)
make dev-services     # Start only PostgreSQL and Redis
```

### Development (Docker)
```bash
make up               # Start all services in Docker
make down             # Stop all services
```

### Running Tests
```bash
# Backend - all tests
cd backend && pytest

# Backend - single test file
cd backend && pytest apps/employees/tests/test_views.py

# Backend - single test function
cd backend && pytest apps/employees/tests/test_views.py::TestEmployeeAPI::test_list_employees -v

# Backend - tests matching pattern
cd backend && pytest -k "employee" -v

# Backend - with coverage
cd backend && pytest --cov=apps

# Frontend - all tests
cd frontend && npm test

# Frontend - single test file
cd frontend && npm test -- src/features/employees/EmployeeList.test.tsx

# E2E tests
cd frontend && npx playwright test
cd frontend && npx playwright test e2e/auth.spec.ts  # single file
```

### Linting
```bash
cd backend && ruff check .
cd backend && ruff format .
cd frontend && npm run lint
```

### Database
```bash
cd backend && python manage.py migrate
cd backend && python manage.py makemigrations <app_name>
cd backend && python manage.py shell_plus
make db-shell         # PostgreSQL shell
```

## Architecture

### Multi-Tenancy Pattern
- `TenantAwareModel` (backend/apps/core/models.py): Base class for all tenant-scoped models
- `TenantAwareViewSet` (backend/apps/core/views.py): Base class for all tenant-scoped API endpoints
- `TenantMiddleware`: Resolves tenant from `X-Tenant-ID` header or subdomain
- All queries are automatically filtered by tenant

### Backend Structure (Django)
```
backend/
├── config/settings/          # base.py, local.py, production.py
├── apps/
│   ├── core/                 # TenantAwareModel, TenantAwareViewSet, permissions
│   ├── tenants/              # Tenant model and management
│   ├── users/                # Custom User model (email-based auth)
│   ├── employees/            # Employee profiles, departments, positions
│   ├── leave/                # LeaveType, LeaveRequest, LeaveBalance, Holiday
│   ├── timetracking/         # TimeEntry, TimeEntryType
│   ├── timesheets/           # Timesheet (period summaries with approval)
│   └── contracts/            # Contract, ContractType, ContractDocument
```

### Frontend Structure (React + TypeScript)
```
frontend/src/
├── api/                      # API client functions
├── features/                 # Feature modules (pages + components)
│   ├── auth/                 # Login, register
│   ├── dashboard/            # Main dashboard
│   ├── employees/            # Employee management
│   ├── organization/         # Departments and positions
│   ├── leave/                # Leave requests
│   ├── calendar/             # Leave/holiday calendar
│   ├── timetracking/         # Time entries
│   ├── timesheets/           # Timesheet management
│   ├── contracts/            # Employment contracts
│   ├── profile/              # User profile
│   └── settings/             # App settings
├── components/               # Shared UI components
├── hooks/                    # Custom React hooks
├── stores/                   # Zustand stores (auth, UI state)
├── types/                    # TypeScript interfaces
└── utils/                    # Utility functions
```

### State Management
- **Server state**: TanStack Query with query keys like `['employees', 'list', filters]`
- **Client state**: Zustand for auth and UI preferences
- **Forms**: React Hook Form + Zod validation

## Code Patterns

### Adding a New API Endpoint (Backend)
1. Create model inheriting `TenantAwareModel` in `apps/<app>/models.py`
2. Create serializer in `apps/<app>/serializers.py`
3. Create ViewSet inheriting `TenantAwareViewSet` in `apps/<app>/views.py`
4. Register routes in `apps/<app>/urls.py`
5. Create migration: `python manage.py makemigrations <app>`

### Adding a Frontend Feature
1. Create feature folder: `src/features/<feature>/`
2. Add API functions: `src/api/<feature>.ts`
3. Add TypeScript types: `src/types/<feature>.ts`
4. Create TanStack Query hooks in the feature folder
5. Add routes in `src/App.tsx`

### Testing Fixtures (Backend)
Use pytest fixtures from `conftest.py`:
```python
@pytest.mark.django_db
def test_employee_list(authenticated_tenant_client, employee):
    response = authenticated_tenant_client.get('/api/v1/employees/')
    assert response.status_code == 200
```

Key fixtures: `tenant`, `user`, `authenticated_client`, `authenticated_tenant_client`, `employee`, `department`, `position`

### Factory Pattern (Testing)
```python
from apps.employees.tests.factories import EmployeeFactory
employee = EmployeeFactory(first_name="John", department=department)
employees = EmployeeFactory.create_batch(5)
```

## API Conventions

- Base pattern: `/api/v1/<resource>/` (list/create), `/api/v1/<resource>/<id>/` (detail)
- Nested resources: `/api/v1/leave/requests/`, `/api/v1/leave/types/`, `/api/v1/contracts/types/`
- Headers: `Authorization: Bearer <token>`, `X-Tenant-ID: <uuid>`
- Pagination: Cursor-based with `count`, `next`, `previous`, `results`

## Key Files Reference

| Purpose | Location |
|---------|----------|
| Django settings | `backend/config/settings/{base,local,production}.py` |
| URL routing | `backend/config/urls.py`, `backend/apps/*/urls.py` |
| Base models | `backend/apps/core/models.py` |
| Base views | `backend/apps/core/views.py` |
| Test fixtures | `backend/conftest.py`, `backend/apps/*/tests/factories.py` |
| API client | `frontend/src/api/client.ts` |
| Auth store | `frontend/src/stores/authStore.ts` |
| Route definitions | `frontend/src/App.tsx` |

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - Django secret key
- `DEBUG` - Enable debug mode

### Frontend
- `VITE_API_URL` - Backend API base URL (default: http://localhost:8000/api/v1)

## MCP Servers

This project includes pre-configured MCP (Model Context Protocol) servers that provide Claude Code with enhanced capabilities. These are automatically set up when opening the project in a Dev Container.

### Available Servers

| Server | Purpose | Example Prompts |
|--------|---------|-----------------|
| **github** | PR reviews, issue management | "Review PR #123", "Create an issue for this bug" |
| **postgres** | Natural language DB queries | "Show employees hired this month", "What tables exist?" |
| **filesystem** | Enhanced file browsing | Browse `/workspace` directories with context |
| **redis** | Cache inspection, key management | "What keys are in Redis?", "Show cached sessions" |
| **playwright** | Browser automation, E2E debugging | "Open login page and take screenshot", "Click the submit button" |
| **memory** | Persistent knowledge across sessions | "Remember this project uses DRF", "What do you know about this codebase?" |
| **fetch** | HTTP requests, API testing | "Fetch the API health endpoint", "Test the login API" |
| **time** | Timezone conversions, date calculations | "What time is it in Berlin?", "Convert 3pm EST to UTC" |
| **context7** | Up-to-date library documentation | "Get React 19 docs", "Show Django 5.0 migration guide" |
| **sequential-thinking** | Structured problem-solving | "Think through this auth flow step by step" |

### Verification

After opening the Dev Container, verify MCP servers are configured:
```bash
claude /mcp
```

### Personal Overrides

To add personal MCP server configurations without affecting the shared config:
1. Create `.mcp.json.local` in the project root
2. Add your custom server configurations
3. This file is gitignored and won't be committed

## Commit Message Format

Use conventional commits: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(employees): add bulk import functionality
fix(auth): resolve token refresh race condition
```
