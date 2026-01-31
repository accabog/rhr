# Raptor HR

[![CI](https://github.com/accabog/rhr/actions/workflows/ci.yml/badge.svg)](https://github.com/accabog/rhr/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/accabog/rhr/branch/main/graph/badge.svg)](https://codecov.io/gh/accabog/rhr)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Enterprise HR management platform with multi-tenant support, time tracking, leave management, and more.

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Tenancy** | Complete data isolation per organization |
| **Employee Management** | Records, departments, positions, org charts |
| **Time Tracking** | Clock in/out, manual entries, approval workflows |
| **Timesheets** | Period-based summaries with multi-step approval |
| **Leave Management** | PTO, sick leave, holiday calendars |
| **Contracts** | Employment agreement management |

## Quick Start

```bash
# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend python manage.py migrate

# Create admin user (optional)
docker-compose exec backend python manage.py createsuperuser
```

**Access the application:**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000/api/v1/ |
| API Docs | http://localhost:8000/api/docs/ |
| Admin | http://localhost:8000/admin/ |

## Tech Stack

### Backend
- Python 3.12 / Django 5.x / Django REST Framework
- PostgreSQL 16 / Redis 7
- Celery for background tasks
- JWT authentication

### Frontend
- React 18 / TypeScript
- Ant Design 5.x
- TanStack Query / Zustand
- Vite

### Infrastructure
- Docker / Docker Compose
- GitHub Actions CI/CD
  - Parallel E2E testing with Playwright caching
  - SBOM generation for supply chain security
  - Migration validation before production deploys

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Installation and first steps |
| [Architecture](docs/architecture.md) | System design with diagrams |
| [Development](docs/development.md) | Local dev setup and debugging |
| [API Reference](docs/api.md) | REST API documentation |
| [Deployment](docs/deployment.md) | Production deployment guide |
| [Database Schema](docs/database.md) | Data model and relationships |
| [Multi-Tenancy](docs/multi-tenancy.md) | Tenant isolation explained |
| [Frontend](docs/frontend.md) | React architecture |

## Project Structure

```
rhr/
├── backend/              # Django REST Framework
│   ├── config/           # Django settings
│   └── apps/             # Django applications
│       ├── core/         # Base models, utilities
│       ├── tenants/      # Multi-tenancy
│       ├── users/        # Authentication
│       ├── employees/    # Employee management
│       ├── timetracking/ # Time entries
│       ├── timesheets/   # Period summaries
│       ├── leave/        # PTO management
│       └── contracts/    # Employment contracts
├── frontend/             # React + TypeScript
│   └── src/
│       ├── api/          # API client
│       ├── features/     # Feature modules
│       ├── stores/       # Zustand state
│       └── types/        # TypeScript types
├── docs/                 # Documentation
└── nginx/                # Reverse proxy config
```

## Running Tests

```bash
# Backend
cd backend && pytest --cov=apps

# Frontend
cd frontend && npm test

# E2E
cd frontend && npm run test:e2e
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Pull request process

## Security

For security concerns, please see [SECURITY.md](SECURITY.md) for:
- Vulnerability reporting
- Security features
- Best practices

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT - see [LICENSE](LICENSE) for details.
