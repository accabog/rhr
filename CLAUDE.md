# Raptor HR (RHR) - Claude Code Instructions

## Project Overview
Multi-tenant HR platform with React frontend and Django REST Framework backend.

## Quick Reference

### Build Commands
```bash
# Backend
cd backend && pip install -e ".[dev]"
cd backend && python manage.py migrate
cd backend && python manage.py runserver

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
