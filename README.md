# Raptor HR

Enterprise HR management platform with multi-tenant support.

## Features

- **Employee Management** - Track employee records, departments, and positions
- **Time Tracking** - Clock in/out, manual time entries
- **Timesheets** - Period-based time summaries with approval workflow
- **Leave Management** - PTO, sick leave, holiday calendar
- **Contracts** - Employment contract management

## Tech Stack

### Backend
- Django 5.x + Django REST Framework
- PostgreSQL 16
- Celery + Redis for background tasks
- JWT authentication

### Frontend
- React 18 + TypeScript
- Ant Design 5.x
- TanStack Query + Zustand
- Vite

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

### Quick Start with Docker

```bash
# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend python manage.py migrate

# Create a superuser (optional)
docker-compose exec backend python manage.py createsuperuser
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1/
- API Documentation: http://localhost:8000/api/docs/

### Local Development

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Set up environment variables
export DATABASE_URL=postgres://rhr:rhr_dev_password@localhost:5432/rhr
export REDIS_URL=redis://localhost:6379/0

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
rhr/
├── backend/           # Django REST Framework backend
│   ├── config/        # Django configuration
│   └── apps/          # Django applications
├── frontend/          # React frontend
│   └── src/
│       ├── api/       # API client
│       ├── features/  # Feature modules
│       └── stores/    # State management
├── nginx/             # Nginx configuration
└── docker-compose.yml
```

## API Documentation

Interactive API documentation is available at `/api/docs/` when running the backend.

## Running Tests

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test
```

## License

MIT
