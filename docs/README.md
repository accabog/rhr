# Raptor HR Documentation

Welcome to the Raptor HR documentation. This guide will help you understand, develop, and deploy the platform.

## Quick Links

| Guide | Description |
|-------|-------------|
| [Getting Started](./getting-started.md) | Installation and first steps |
| [Architecture](./architecture.md) | System design and components |
| [Development](./development.md) | Local development setup |
| [API Reference](./api.md) | REST API documentation |
| [Deployment](./deployment.md) | Production deployment guide |

## Core Concepts

| Topic | Description |
|-------|-------------|
| [Multi-Tenancy](./multi-tenancy.md) | Tenant isolation and data separation |
| [Database Schema](./database.md) | Data model and relationships |
| [Frontend Architecture](./frontend.md) | React application structure |

## Overview

Raptor HR is an enterprise HR management platform featuring:

- **Multi-tenant architecture** - Complete data isolation per organization
- **Employee management** - Records, departments, positions
- **Time tracking** - Clock in/out, manual entries, approval workflows
- **Leave management** - PTO, sick leave, holiday calendars
- **Timesheets** - Period-based summaries with approval workflows
- **Contracts** - Employment agreement management

## Technology Stack

### Backend
- Python 3.12+
- Django 5.x + Django REST Framework
- PostgreSQL 16
- Redis 7 (caching, Celery broker)
- Celery (background tasks)

### Frontend
- React 18 + TypeScript
- Ant Design 5.x
- TanStack Query (server state)
- Zustand (client state)
- Vite (build tool)

### Infrastructure
- Docker + Docker Compose
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on:
- Setting up your development environment
- Code style and conventions
- Pull request process
- Testing requirements

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/rhr/issues)
- **Security**: See [SECURITY.md](../SECURITY.md) for vulnerability reporting
