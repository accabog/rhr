# Deployment Guide

This guide covers deploying Raptor HR to production environments.

## Production Requirements

### Infrastructure

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **App Server** | 2 CPU, 4GB RAM | 4 CPU, 8GB RAM |
| **Database** | 2 CPU, 4GB RAM | 4 CPU, 16GB RAM |
| **Redis** | 1 CPU, 1GB RAM | 2 CPU, 4GB RAM |

### Software

- Docker 24+ and Docker Compose v2
- PostgreSQL 16
- Redis 7
- Nginx (for reverse proxy)
- SSL/TLS certificates

## Environment Variables

### Backend Production

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `SECRET_KEY` | Django secret key (use strong random value) | Yes |
| `DEBUG` | Must be `false` in production | Yes |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames | Yes |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | Yes |
| `SENTRY_DSN` | Sentry error tracking (optional) | No |

### Frontend Production

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |

## Docker Compose Production

Create a `docker-compose.prod.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: rhr
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: always

  backend:
    image: ghcr.io/your-org/rhr-backend:latest
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
      - DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@db:5432/rhr
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=false
      - ALLOWED_HOSTS=${ALLOWED_HOSTS}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: always

  celery:
    image: ghcr.io/your-org/rhr-backend:latest
    command: celery -A config worker -l info
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
      - DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@db:5432/rhr
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db
      - redis
    restart: always

  frontend:
    image: ghcr.io/your-org/rhr-frontend:latest
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  postgres_data:
  redis_data:
```

## Nginx Configuration

Example `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Django Admin
        location /admin/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Static files
        location /static/ {
            proxy_pass http://backend;
        }

        # Media files
        location /media/ {
            proxy_pass http://backend;
        }
    }
}
```

## Database Backups

### Automated Backups

Create a backup script `scripts/backup-db.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/rhr_${TIMESTAMP}.sql.gz"

# Create backup
docker-compose exec -T db pg_dump -U ${DB_USER} rhr | gzip > ${BACKUP_FILE}

# Remove backups older than 30 days
find ${BACKUP_DIR} -name "rhr_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

### Restore from Backup

```bash
# Stop application
docker-compose stop backend celery

# Restore database
gunzip -c backup.sql.gz | docker-compose exec -T db psql -U ${DB_USER} rhr

# Restart application
docker-compose start backend celery
```

## Deployment Steps

### Initial Deployment

```bash
# 1. Clone repository
git clone https://github.com/your-org/rhr.git
cd rhr

# 2. Create .env file
cp .env.example .env
# Edit .env with production values

# 3. Pull images
docker-compose -f docker-compose.prod.yml pull

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Run migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 6. Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# 7. Create superuser
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### Update Deployment

```bash
# 1. Pull latest images
docker-compose -f docker-compose.prod.yml pull

# 2. Apply migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 3. Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## CI/CD Pipeline

The project includes GitHub Actions workflows:

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push/PR to main/develop | Lint, test, build images |
| `deploy-staging.yml` | Push to develop | Deploy to staging |
| `deploy-production.yml` | Release tag | Deploy to production |

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `GHCR_TOKEN` | GitHub Container Registry token |
| `STAGING_SSH_KEY` | SSH key for staging server |
| `PRODUCTION_SSH_KEY` | SSH key for production server |
| `STAGING_HOST` | Staging server hostname |
| `PRODUCTION_HOST` | Production server hostname |

## Monitoring

### Health Checks

The backend provides health check endpoints:

- `GET /api/v1/health/` - Basic health check
- `GET /api/v1/health/ready/` - Readiness check (includes DB)

### Logging

Configure centralized logging with your preferred solution:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **Datadog**
- **Sentry** (for error tracking)

### Metrics

Consider adding:

- **Prometheus** for metrics collection
- **Grafana** for visualization
- Django Prometheus middleware for request metrics

## Scaling

### Horizontal Scaling

Scale backend containers:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Celery Workers

Scale Celery workers based on workload:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale celery=4
```

### Database Scaling

For high-traffic deployments, consider:

- Read replicas for query distribution
- Connection pooling with PgBouncer
- Managed database services (AWS RDS, Cloud SQL)

## Security Checklist

- [ ] SSL/TLS certificates installed and auto-renewed
- [ ] `DEBUG=false` in production
- [ ] Strong `SECRET_KEY` generated
- [ ] Database credentials secured
- [ ] Firewall configured (only expose ports 80/443)
- [ ] Regular security updates applied
- [ ] Backup strategy implemented
- [ ] Rate limiting configured
- [ ] CORS properly configured
