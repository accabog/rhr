# Raptor HR (RHR) - Claude Code Instructions

## Project Overview
Multi-tenant HR platform with React frontend and Django REST Framework backend.

> **Full development setup guide**: See [docs/development.md](docs/development.md) for detailed environment setup, Dev Container usage, and troubleshooting.

## Quick Reference

### Build Commands
```bash
# Backend (using uv - recommended)
cd backend && uv sync
cd backend && python manage.py migrate
cd backend && python manage.py runserver

# Backend (using pip - alternative)
cd backend && pip install -e ".[dev]"

# Frontend
cd frontend && npm install
cd frontend && npm run dev

# Docker (full stack)
docker-compose up -d
```

### Test Commands
```bash
# Backend
cd backend && pytest
cd backend && pytest --cov=apps

# Frontend
cd frontend && npm test
cd frontend && npm run test:coverage

# Linting
cd backend && ruff check .
cd frontend && npm run lint
```

### Key URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1/
- API Docs: http://localhost:8000/api/docs/
- Admin: http://localhost:8000/admin/

## Project Structure

```
rhr/
├── backend/              # Django REST Framework
│   ├── config/           # Django settings and URLs
│   │   └── settings/     # Split settings (base/local/production)
│   └── apps/             # Django applications
│       ├── core/         # Base models, permissions
│       ├── tenants/      # Multi-tenancy
│       ├── users/        # Authentication
│       ├── employees/    # Employee management
│       ├── timetracking/ # Time entries
│       ├── timesheets/   # Period summaries
│       ├── leave/        # PTO management
│       └── contracts/    # Employment contracts
├── frontend/             # React + TypeScript
│   └── src/
│       ├── api/          # API client and hooks
│       ├── components/   # Shared UI components (DocumentList, etc.)
│       ├── data/         # Static data (countries, timezones)
│       ├── features/     # Feature modules
│       │   ├── calendar/ # Leave/holiday calendar
│       │   ├── profile/  # User profile management
│       │   ├── settings/ # App and tenant settings
│       │   └── ...
│       ├── hooks/        # Custom hooks (useTimezone, etc.)
│       ├── layouts/      # App layouts
│       ├── stores/       # Zustand state
│       ├── types/        # TypeScript types
│       └── utils/        # Utility functions
└── nginx/                # Reverse proxy config
```

## Architecture Decisions

### Multi-Tenancy
- Shared database with `tenant_id` foreign key on all tenant-scoped models
- `TenantAwareModel` base class in `apps/core/models.py`
- `TenantMiddleware` resolves tenant from X-Tenant-ID header or subdomain

### Authentication
- JWT tokens via SimpleJWT (15min access, 7d refresh)
- Token refresh with rotation and blacklisting
- Custom User model with email-based login

### API Design
- RESTful with DRF ViewSets
- Cursor-based pagination for large datasets
- Tenant scoping via `TenantAwareViewSet` base class

### Frontend State
- TanStack Query for server state (API data)
- Zustand for client state (auth, UI)
- React Hook Form + Zod for form validation

## Code Patterns

### Adding a New API Endpoint (Backend)
1. Create model in `apps/<app>/models.py` inheriting `TenantAwareModel`
2. Create serializer in `apps/<app>/serializers.py`
3. Create ViewSet in `apps/<app>/views.py` inheriting `TenantAwareViewSet`
4. Register routes in `apps/<app>/urls.py`

### Adding a New Feature (Frontend)
1. Create feature folder in `src/features/<feature>/`
2. Add API functions in `src/api/<feature>.ts`
3. Create page components in the feature folder
4. Add routes in `src/App.tsx`

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - Django secret key
- `DEBUG` - Enable debug mode
- `ALLOWED_HOSTS` - Comma-separated allowed hosts

### Frontend
- `VITE_API_URL` - Backend API base URL

## Testing Guidelines
- Backend: Use pytest with factory_boy for fixtures
- Frontend: Use Vitest with React Testing Library
- E2E: Playwright for critical user flows

## Makefile Commands (Development Shortcuts)

```bash
make up          # Start all Docker services
make down        # Stop all services
make logs        # Follow service logs
make migrate     # Run Django migrations
make migrations  # Create new migrations
make test        # Run all tests
make test-be     # Run backend tests only
make test-fe     # Run frontend tests only
make lint        # Run all linters
make shell       # Open Django shell
make db-shell    # Open PostgreSQL shell
make seed        # Seed development data
```

## Database Schema Overview

### Core Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `tenants_tenant` | Organizations/companies | `name`, `subdomain`, `settings` |
| `users_user` | All users (employees, admins) | `email`, `tenant_id`, `role` |
| `employees_employee` | Employee profiles | `user_id`, `hire_date`, `department` |

### HR Domain Tables
| Table | Description | Relationships |
|-------|-------------|---------------|
| `contracts_contract` | Employment contracts | FK to `employee` |
| `leave_leaverequest` | PTO/leave requests | FK to `employee`, `leave_type` |
| `leave_leavetype` | Leave categories (vacation, sick) | FK to `tenant` |
| `timetracking_timeentry` | Clock in/out records | FK to `employee` |
| `timesheets_timesheet` | Period summaries | FK to `employee` |

### Tenant Isolation Pattern
All tenant-scoped tables have a `tenant_id` foreign key. Queries are automatically filtered by `TenantAwareViewSet`.

## API Conventions

### Endpoint Patterns
```
GET    /api/v1/<resource>/          # List (paginated)
POST   /api/v1/<resource>/          # Create
GET    /api/v1/<resource>/<id>/     # Retrieve
PUT    /api/v1/<resource>/<id>/     # Update (full)
PATCH  /api/v1/<resource>/<id>/     # Update (partial)
DELETE /api/v1/<resource>/<id>/     # Delete
```

### Headers
- `Authorization: Bearer <token>` - JWT access token
- `X-Tenant-ID: <uuid>` - Tenant identifier (required for multi-tenant endpoints)

### Pagination Response Format
```json
{
  "count": 100,
  "next": "http://api/v1/resource/?cursor=abc",
  "previous": null,
  "results": [...]
}
```

## Debugging Commands

```bash
# Check migration status
cd backend && python manage.py showmigrations

# Django shell with models loaded
cd backend && python manage.py shell_plus

# View SQL for a queryset
print(queryset.query)

# Check for missing migrations
cd backend && python manage.py makemigrations --check

# Reset local database (development only)
docker-compose down -v && docker-compose up -d
```

## Claude Code Skills

Custom skills are available for common tasks:
- `/migrate` - Generate and run Django migrations
- `/add-api` - Scaffold a new API endpoint with tests
- `/add-feature` - Create a new frontend feature module

## Factory Patterns (Testing)

Backend tests use factory_boy. Factories are in `apps/<app>/tests/factories.py`:

```python
from apps.employees.tests.factories import EmployeeFactory
from apps.tenants.tests.factories import TenantFactory

# Create with defaults
employee = EmployeeFactory()

# Create with specific values
employee = EmployeeFactory(
    first_name="John",
    department="Engineering"
)

# Create batch
employees = EmployeeFactory.create_batch(5)
```

## Base Classes Reference

### TenantAwareModel
**Location**: `backend/apps/core/models.py`
**Use for**: ALL tenant-scoped data models
**Provides**: `tenant` FK (CASCADE), `created_at`, `updated_at`

```python
from apps.core.models import TenantAwareModel

class MyModel(TenantAwareModel):
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'name'],
                name='unique_mymodel_name_per_tenant'
            )
        ]
```

### TenantAwareViewSet
**Location**: `backend/apps/core/views.py`
**Use for**: ALL tenant-scoped API endpoints
**Provides**: Auto-filters queryset by `request.tenant`, sets tenant on create

```python
from apps.core.views import TenantAwareViewSet

class MyModelViewSet(TenantAwareViewSet):
    queryset = MyModel.objects.all()
    serializer_class = MyModelSerializer
```

### TenantAwareManager
**Provides**: `.for_tenant(tenant)` queryset method

```python
# Usage in code
MyModel.objects.for_tenant(request.tenant).filter(active=True)
```

## Frontend Query Keys

**Pattern**: `['resource', 'scope', ...params]`

| Query Key | Description |
|-----------|-------------|
| `['employees', 'list', filters]` | Employee list with filters |
| `['employees', 'detail', id]` | Single employee |
| `['employees', 'me']` | Current user's employee |
| `['leave', 'requests', employeeId]` | Leave requests for employee |
| `['leave', 'types']` | All leave types |
| `['departments', 'tree']` | Department hierarchy |

**Invalidation**:
```typescript
// Invalidate all employee queries
queryClient.invalidateQueries({ queryKey: ['employees'] });

// Invalidate specific employee
queryClient.invalidateQueries({ queryKey: ['employees', 'detail', id] });
```

## Error Responses

| Status | When | Frontend Action |
|--------|------|-----------------|
| 400 | Validation failed | Show field-level errors from response |
| 401 | Token expired | Trigger token refresh, retry request |
| 403 | No permission | Show "Access Denied" message |
| 404 | Not found / wrong tenant | Navigate away, show "Not Found" |
| 500 | Server error | Show generic error, log to console |

## Test Fixtures (conftest.py)

### Core Fixtures
| Fixture | Creates | Dependencies |
|---------|---------|--------------|
| `tenant` | Tenant instance | None |
| `user` | User with password | None |
| `authenticated_client` | APIClient with token | user |
| `authenticated_tenant_client` | APIClient + X-Tenant-ID | user, tenant |

### Domain Fixtures
| Fixture | Creates | Dependencies |
|---------|---------|--------------|
| `department` | Department | tenant |
| `position` | Position | tenant |
| `employee` | Employee | tenant, department, position |
| `employee_with_user` | Employee + linked User | user, tenant, department, position |
| `leave_type` | LeaveType | tenant |
| `leave_request` | LeaveRequest | employee, leave_type |

### Usage Example
```python
@pytest.mark.django_db
def test_employee_list(authenticated_tenant_client, employee):
    response = authenticated_tenant_client.get('/api/v1/employees/')
    assert response.status_code == 200
    assert len(response.data['results']) == 1
```

## Checklists

### Adding a New Model
- [ ] Inherit from `TenantAwareModel`
- [ ] Add unique constraint per tenant if needed
- [ ] Define indexes for frequently filtered columns
- [ ] Add `__str__` method
- [ ] Add to `admin.py`
- [ ] Create and run migration
- [ ] Add fixture to `conftest.py`
- [ ] Write model tests

### Adding an API Endpoint
- [ ] Create serializer (consider List vs Detail versions)
- [ ] Create ViewSet inheriting `TenantAwareViewSet`
- [ ] Register in `urls.py` router
- [ ] Add permission classes if needed
- [ ] Add tests for CRUD operations
- [ ] Add tests for tenant isolation
- [ ] Update API documentation

### Adding a Frontend Feature
- [ ] Create `src/features/<feature>/` folder
- [ ] Add TypeScript interfaces in `src/types/`
- [ ] Add API functions in `src/api/<feature>.ts`
- [ ] Create TanStack Query hooks
- [ ] Create page components
- [ ] Add routes in `src/App.tsx`
- [ ] Add to navigation if needed
- [ ] Write component tests
