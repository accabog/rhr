# Raptor HR Deployment Guide

This guide covers setting up staging and production environments for Raptor HR.

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

## Quick Start (Staging)

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
# - ALLOWED_HOSTS=staging.yourdomain.com
# - CSRF_TRUSTED_ORIGINS=https://staging.yourdomain.com
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

# Create admin user
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Verify
curl https://staging.yourdomain.com/api/v1/health/
```

### 7. Configure GitHub for Auto-Deploy

#### Add Repository Secrets

Go to Settings → Secrets and variables → Actions → Secrets:

| Secret | Value |
|--------|-------|
| `STAGING_HOST` | `staging.yourdomain.com` |
| `STAGING_USER` | `ubuntu` |
| `STAGING_SSH_KEY` | Contents of your .pem file |
| `SECRET_KEY` | Same as in your .env |
| `POSTGRES_PASSWORD` | Same as in your .env |

#### Enable Staging Deployments

Go to Settings → Secrets and variables → Actions → Variables:

| Variable | Value |
|----------|-------|
| `STAGING_ENABLED` | `true` |

---

## Deployment Workflow

### Automatic Deployments

Pushes to `main` trigger this workflow:

1. **CI** runs tests, linting, builds Docker images
2. **Docker** pushes images to GitHub Container Registry
3. **Staging Deploy** (if `STAGING_ENABLED=true`):
   - SSHs into staging server
   - Pulls latest images
   - Runs migrations
   - Restarts services
   - Runs health checks

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

---

## Maintenance

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Database Backup

```bash
# Create backup
./scripts/deploy.sh backup

# Manual backup
docker compose -f docker-compose.prod.yml exec db \
    pg_dump -U rhr rhr | gzip > backup_$(date +%Y%m%d).sql.gz
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

---

## Troubleshooting

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

### Health Check Failing

```bash
# Check backend health
curl http://localhost:8000/api/v1/health/

# Check nginx health
curl http://localhost/health

# Check all services
docker compose -f docker-compose.prod.yml ps
```

---

## Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| AWS Lightsail (2GB) | $12 |
| Static IP | Free (while attached) |
| Let's Encrypt SSL | Free |
| **Total** | **$12/month** |

---

## Files Reference

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production Docker configuration |
| `nginx/nginx.prod.conf` | Nginx with SSL configuration |
| `.env` | Environment variables (not in git) |
| `.env.staging.example` | Template for staging .env |
| `scripts/deploy.sh` | Deployment helper script |
| `scripts/setup-server.sh` | Server setup script |
| `.github/workflows/deploy-staging.yml` | GitHub Actions deployment |
