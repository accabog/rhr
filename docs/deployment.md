# Deployment Guide

This guide covers deploying Raptor HR to staging and production environments.

> **Staging**: https://staging.raptorhr.com

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS Lightsail                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                      Docker                              ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐ ││
│  │  │ nginx   │──│frontend │  │ backend │──│ PostgreSQL  │ ││
│  │  │ (SSL)   │  │ (React) │  │(Django) │  │   + Redis   │ ││
│  │  └────┬────┘  └─────────┘  └────┬────┘  └─────────────┘ ││
│  │       │                         │                        ││
│  └───────┼─────────────────────────┼────────────────────────┘│
│          │                         │                         │
│       :443/:80                  :8000                       │
└──────────┼─────────────────────────┼─────────────────────────┘
           │
     Let's Encrypt
        (SSL)
```

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
| `CSRF_TRUSTED_ORIGINS` | Trusted origins for CSRF | Yes |
| `SENTRY_DSN` | Sentry error tracking (optional) | No |

### Frontend Production

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |

## Quick Start (AWS Lightsail Staging)

### Prerequisites
- AWS Lightsail instance ($12/month - 2GB RAM, 1 vCPU)
- Custom domain with DNS configured
- SSH access to the server

### 1. Create Lightsail Instance

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click **Create instance**
3. Select:
   - Region: Choose closest to your users
   - Platform: **Linux/Unix**
   - Blueprint: **Ubuntu 24.04 LTS** (or 22.04 LTS)
   - Instance plan: **$12/month** (2GB RAM)
   - Name: `rhr-staging`
4. Configure networking:
   - Create and attach a Static IP
   - Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 2. Configure DNS

Add an A record in your domain registrar:
```
Type: A
Name: staging
Value: <your-lightsail-static-ip>
TTL: 300
```

### 3. Run Server Setup

SSH into your server and run:

```bash
# Connect
ssh -i /path/to/your-key.pem ubuntu@<your-static-ip>

# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/accabog/rhr/main/scripts/setup-server.sh | sudo bash
```

Or manually:

```bash
# Clone repository
sudo mkdir -p /opt/rhr
sudo chown ubuntu:ubuntu /opt/rhr
git clone https://github.com/accabog/rhr.git /opt/rhr
cd /opt/rhr

# Run setup
sudo ./scripts/setup-server.sh
```

### 4. Configure Environment

```bash
cd /opt/rhr

# Edit environment file
nano .env

# Update these values:
# - ALLOWED_HOSTS=staging.yourdomain.com,localhost  (localhost required for health checks)
# - CSRF_TRUSTED_ORIGINS=https://staging.yourdomain.com
# - CORS_ALLOWED_ORIGINS=https://staging.yourdomain.com
```

### 5. Set Up SSL Certificate

```bash
# Get certificate from Let's Encrypt
sudo certbot certonly --standalone -d staging.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/staging.yourdomain.com/fullchain.pem /opt/rhr/nginx/ssl/
sudo cp /etc/letsencrypt/live/staging.yourdomain.com/privkey.pem /opt/rhr/nginx/ssl/
sudo chown ubuntu:ubuntu /opt/rhr/nginx/ssl/*.pem
```

### 6. Initial Deployment

```bash
cd /opt/rhr

# Pull and start services
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Collect static files
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Create admin user
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Verify
curl https://staging.yourdomain.com/api/v1/health/
```

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
    volumes:
      - media_data:/app/media
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
  media_data:
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

        # Media files (logos, avatars, documents)
        location /media/ {
            alias /app/media/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## Deployment Workflow

### Automatic Deployments

Pushes to `main` trigger this workflow:

1. **CI** runs tests, linting, builds Docker images
   - Playwright browsers are cached for faster E2E runs
   - SBOM (Software Bill of Materials) generated for container images
2. **Docker** pushes images to GitHub Container Registry
3. **Staging Deploy** (if `STAGING_ENABLED=true`):
   - SSHs into staging server
   - Pulls latest images
   - Runs migrations
   - Restarts services
   - Runs health checks

### Production Deployments

Production deployments are triggered manually or on release:

1. **Prepare** - Determines image tag from input or release
2. **Database Backup** - Creates backup before deployment (unless skipped)
3. **Migration Validation** - Dry-run of migrations to catch issues early
4. **Deploy** - Pulls images, runs migrations, restarts services
5. **Verify** - Multiple health checks to confirm stability
6. **Rollback** - Automatic rollback if deployment fails

### Manual Deployment

SSH into the server and use the deploy script:

```bash
cd /opt/rhr

# Full deployment
./scripts/deploy.sh deploy

# Just pull new images
./scripts/deploy.sh pull

# Run migrations only
./scripts/deploy.sh migrate

# Rollback to previous version
./scripts/deploy.sh rollback

# Check health
./scripts/deploy.sh health

# View logs
./scripts/deploy.sh logs
./scripts/deploy.sh logs backend
```

### Update Deployment

```bash
# 1. Pull latest images
docker compose -f docker-compose.prod.yml pull

# 2. Apply migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 3. Restart services
docker compose -f docker-compose.prod.yml up -d
```

## GitHub Actions Configuration

### Repository Secrets

Go to Settings → Secrets and variables → Actions → Secrets:

| Secret | Description |
|--------|-------------|
| `STAGING_HOST` | Staging server hostname |
| `STAGING_USER` | SSH username (e.g., `ubuntu`) |
| `STAGING_SSH_KEY` | Contents of your .pem file |
| `PRODUCTION_HOST` | Production server hostname |
| `PRODUCTION_SSH_KEY` | SSH key for production server |
| `SECRET_KEY` | Django secret key |
| `POSTGRES_PASSWORD` | Database password |
| `GHCR_TOKEN` | GitHub Container Registry token |

### Repository Variables

Go to Settings → Secrets and variables → Actions → Variables:

| Variable | Value |
|----------|-------|
| `STAGING_ENABLED` | `true` to enable staging deployments |

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
docker compose -f docker-compose.prod.yml exec -T db \
    pg_dump -U ${DB_USER} rhr | gzip > ${BACKUP_FILE}

# Remove backups older than 30 days
find ${BACKUP_DIR} -name "rhr_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

### Restore from Backup

```bash
# Stop application
docker compose -f docker-compose.prod.yml stop backend celery

# Restore database
gunzip -c backup.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U ${DB_USER} rhr

# Restart application
docker compose -f docker-compose.prod.yml start backend celery
```

## Maintenance

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx
```

### SSL Certificate Renewal

Certbot auto-renews certificates. To manually renew:

```bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/staging.yourdomain.com/*.pem /opt/rhr/nginx/ssl/
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Disk Space Cleanup

```bash
# Check disk usage
df -h

# Clean up old Docker images
docker system prune -a

# Clean up old logs
docker compose -f docker-compose.prod.yml logs --tail=0
```

## Health Checks

The backend provides health check endpoints:

- `GET /api/v1/health/` - Basic health check
- `GET /api/v1/health/ready/` - Readiness check (includes DB)

```bash
# Check backend health
curl http://localhost:8000/api/v1/health/

# Check nginx health
curl http://localhost/health

# Check all services
docker compose -f docker-compose.prod.yml ps
```

## Scaling

### Horizontal Scaling

Scale backend containers:

```bash
docker compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Celery Workers

Scale Celery workers based on workload:

```bash
docker compose -f docker-compose.prod.yml up -d --scale celery=4
```

### Database Scaling

For high-traffic deployments, consider:

- Read replicas for query distribution
- Connection pooling with PgBouncer
- Managed database services (AWS RDS, Cloud SQL)

## Monitoring

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

## Troubleshooting

### CORS Error (corsheaders.E013)
If you see `corsheaders.E013: Origin '' in CORS_ALLOWED_ORIGINS is missing scheme`:
```bash
# Add CORS_ALLOWED_ORIGINS to your .env
echo "CORS_ALLOWED_ORIGINS=https://staging.yourdomain.com" >> .env
docker compose -f docker-compose.prod.yml restart backend
```

### HTTP 400 Bad Request
If health checks return 400, `localhost` is likely missing from ALLOWED_HOSTS:
```bash
# Ensure ALLOWED_HOSTS includes localhost for internal health checks
# ALLOWED_HOSTS=staging.yourdomain.com,localhost
```

### Backend Health Check Stuck
If the backend container stays "starting" or health checks hang:
```bash
# Test health endpoint directly inside container
docker compose -f docker-compose.prod.yml exec backend python -c \
  "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/v1/health/').read())"
```

### Container Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend

# Check container status
docker compose -f docker-compose.prod.yml ps

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Database Connection Issues

```bash
# Check if database is running
docker compose -f docker-compose.prod.yml exec db pg_isready -U rhr

# Connect to database
docker compose -f docker-compose.prod.yml exec db psql -U rhr -d rhr
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Test SSL
curl -vI https://staging.yourdomain.com
```

## CI/CD Pipeline

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CI Pipeline (ci.yml)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐ │
│  │ Backend  │   │ Frontend │   │   E2E    │   │    Docker    │ │
│  │  Tests   │   │  Tests   │   │  Tests   │   │ Build & Push │ │
│  │ (pytest) │   │ (vitest) │   │(Playwright)│  │   + SBOM    │ │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └──────┬───────┘ │
│       │              │              │                 │         │
│       └──────────────┴──────────────┴─────────────────┘         │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Staging Deploy (deploy-staging.yml)                 │
│  ┌────────┐   ┌────────────┐                                    │
│  │ Deploy │ → │ Smoke Test │                                    │
│  └────────┘   └────────────┘                                    │
└─────────────────────────────────────────────────────────────────┘
```

### CI Features

| Feature | Description |
|---------|-------------|
| **Playwright Caching** | Browser binaries cached between runs (~30-60s saved) |
| **Parallel E2E Tests** | 4 workers run tests concurrently |
| **Coverage Gates** | Backend: 70%, Frontend: configurable in vite.config.ts |
| **SBOM Generation** | Software Bill of Materials for supply chain security |
| **Build Metrics** | Job results reported as GitHub annotations |

### Production Safeguards

| Feature | Description |
|---------|-------------|
| **Migration Dry-Run** | `migrate --plan` validates migrations before applying |
| **Pre-Deployment Backup** | Database backed up before each deployment |
| **Automatic Rollback** | Previous images restored if deployment fails |
| **Health Checks** | Multiple checks verify deployment stability |

## Test Coverage

### Coverage Thresholds

| Component | Minimum Coverage |
|-----------|-----------------|
| Backend | 70% |
| Frontend | 35% lines, 50% functions |

Frontend thresholds are configured in `frontend/vite.config.ts`.

### Local Coverage

```bash
# Backend
cd backend && pytest --cov=apps --cov-report=html
open htmlcov/index.html

# Frontend
cd frontend && npm run test:coverage
```

## Cost Summary (AWS Lightsail)

| Service | Monthly Cost |
|---------|--------------|
| AWS Lightsail (2GB) | $12 |
| Static IP | Free (while attached) |
| Let's Encrypt SSL | Free |
| **Total** | **$12/month** |

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

## Files Reference

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production Docker configuration |
| `nginx/nginx.prod.conf` | Nginx with SSL configuration |
| `.env` | Environment variables (not in git) |
| `.env.staging.example` | Template for staging .env |
| `scripts/deploy.sh` | Deployment helper script |
| `scripts/setup-server.sh` | Server setup script |
| `.github/workflows/ci.yml` | CI pipeline (tests, builds, SBOM) |
| `.github/workflows/deploy-staging.yml` | Staging deployment |
| `.github/workflows/deploy-production.yml` | Production deployment with safeguards |
