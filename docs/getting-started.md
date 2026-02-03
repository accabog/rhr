# Getting Started

This guide will help you get Raptor HR running locally.

## Prerequisites

- **Docker** and **Docker Compose** (recommended for quick start)
- **Python 3.12+** (for backend development)
- **Node.js 20+** (for frontend development)
- **PostgreSQL 16** (if running without Docker)
- **Redis 7** (if running without Docker)

## Quick Start with Docker

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/your-org/rhr.git
cd rhr

# Start all services
docker compose up -d

# Run database migrations
docker compose exec backend python manage.py migrate

# Create a superuser (optional)
docker compose exec backend python manage.py createsuperuser
```

The application is now running at:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api/v1/ |
| API Documentation | http://localhost:8000/api/docs/ |
| Django Admin | http://localhost:8000/admin/ |

## First Steps

### 1. Create a Tenant

Tenants represent organizations in the multi-tenant system. Create one via the Django admin or API:

```bash
# Via Django shell
docker compose exec backend python manage.py shell

>>> from apps.tenants.models import Tenant
>>> tenant = Tenant.objects.create(name="Acme Corp", slug="acme")
```

### 2. Create a User and Membership

```python
>>> from apps.users.models import User
>>> from apps.tenants.models import TenantMembership

>>> user = User.objects.create_user(
...     email="admin@acme.com",
...     password="secure_password",
...     first_name="Admin",
...     last_name="User"
... )

>>> TenantMembership.objects.create(
...     user=user,
...     tenant=tenant,
...     role="owner",
...     is_default=True
... )
```

### 3. Sync National Holidays (Optional)

Import national holidays for your departments' countries:

```bash
# Via Django shell
docker compose exec backend python manage.py sync_holidays

# Or for a specific country
docker compose exec backend python manage.py sync_holidays --country=US
```

This fetches public holidays from the Nager.Date API and stores them for leave calculations.

### 4. Access the Application

Open http://localhost:3000 and log in with your credentials.

## Manual Installation

If you prefer to run services without Docker:

### Backend Setup

```bash
cd backend

# Install dependencies using uv (recommended - fast)
uv sync

# Or using pip (traditional method)
# python -m venv venv
# source venv/bin/activate  # On Windows: venv\Scripts\activate
# pip install -e ".[dev]"

# Set environment variables
export DATABASE_URL=postgres://user:password@localhost:5432/rhr
export REDIS_URL=redis://localhost:6379/0
export SECRET_KEY=your-secret-key
export DEBUG=true

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variable
export VITE_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `SECRET_KEY` | Django secret key | Required |
| `DEBUG` | Enable debug mode | `false` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost` |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000/api/v1` |

## Verify Installation

Run the test suites to verify everything is working:

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test
```

## Next Steps

- [Development Guide](./development.md) - Set up your development environment
- [API Documentation](./api.md) - Explore the REST API
- [Architecture Overview](./architecture.md) - Understand system design
