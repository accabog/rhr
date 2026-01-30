#!/bin/bash
#
# Raptor HR Deployment Script
# Usage: ./deploy.sh [command] [options]
#
# Commands:
#   pull      - Pull latest images
#   migrate   - Run database migrations
#   deploy    - Full deployment (pull, migrate, restart)
#   rollback  - Rollback to previous version
#   health    - Check service health
#   backup    - Create database backup
#   logs      - View service logs
#

set -e

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost/health}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-10}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-5}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker compose is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        exit 1
    fi
}

# Pull latest images
pull_images() {
    log_info "Pulling latest images..."
    docker compose -f "$COMPOSE_FILE" pull
    log_info "Images pulled successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    docker compose -f "$COMPOSE_FILE" run --rm backend python manage.py migrate --no-input
    log_info "Migrations completed"
}

# Collect static files
collect_static() {
    log_info "Collecting static files..."
    docker compose -f "$COMPOSE_FILE" run --rm backend python manage.py collectstatic --no-input
    log_info "Static files collected"
}

# Health check with retries
health_check() {
    log_info "Running health checks..."
    local retries=0

    while [ $retries -lt "$HEALTH_CHECK_RETRIES" ]; do
        if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_info "Health check passed!"
            return 0
        fi

        retries=$((retries + 1))
        log_warn "Health check failed, retrying... ($retries/$HEALTH_CHECK_RETRIES)"
        sleep "$HEALTH_CHECK_INTERVAL"
    done

    log_error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

# Create database backup
create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/rhr_backup_$timestamp.sql.gz"

    log_info "Creating database backup..."
    mkdir -p "$BACKUP_DIR"

    docker compose -f "$COMPOSE_FILE" exec -T db \
        pg_dump -U rhr rhr | gzip > "$backup_file"

    log_info "Backup created: $backup_file"
    echo "$backup_file"
}

# Save current state for rollback
save_rollback_state() {
    log_info "Saving current state for rollback..."
    docker compose -f "$COMPOSE_FILE" config | grep 'image:' > .previous_images
    log_info "Rollback state saved"
}

# Restart services
restart_services() {
    log_info "Restarting services..."
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
    log_info "Services restarted"
}

# Full deployment
deploy() {
    log_info "Starting deployment..."

    # Save current state for potential rollback
    if [ -f "$COMPOSE_FILE" ]; then
        save_rollback_state
    fi

    # Create backup before deployment
    if [ "${SKIP_BACKUP:-false}" != "true" ]; then
        create_backup
    fi

    # Pull new images
    pull_images

    # Run migrations
    run_migrations

    # Collect static files
    collect_static

    # Restart services
    restart_services

    # Wait for services to stabilize
    log_info "Waiting for services to stabilize..."
    sleep 30

    # Health check
    if health_check; then
        log_info "Deployment completed successfully!"

        # Clean up old images
        log_info "Cleaning up old images..."
        docker image prune -f
    else
        log_error "Deployment failed health check!"
        log_warn "Consider running: $0 rollback"
        exit 1
    fi
}

# Rollback to previous version
rollback() {
    log_info "Starting rollback..."

    if [ ! -f .previous_images ]; then
        log_error "No previous state found. Cannot rollback."
        exit 1
    fi

    # Extract previous image references
    local prev_backend=$(grep 'backend' .previous_images | awk '{print $2}' | head -1)
    local prev_frontend=$(grep 'frontend' .previous_images | awk '{print $2}' | head -1)

    if [ -z "$prev_backend" ] || [ -z "$prev_frontend" ]; then
        log_error "Could not determine previous images"
        exit 1
    fi

    log_info "Rolling back to:"
    log_info "  Backend: $prev_backend"
    log_info "  Frontend: $prev_frontend"

    export BACKEND_IMAGE="$prev_backend"
    export FRONTEND_IMAGE="$prev_frontend"

    # Restart with previous images
    restart_services

    # Wait and check health
    sleep 30
    if health_check; then
        log_info "Rollback completed successfully!"
    else
        log_error "Rollback failed health check!"
        exit 1
    fi
}

# View logs
view_logs() {
    local service="${1:-}"
    if [ -n "$service" ]; then
        docker compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        docker compose -f "$COMPOSE_FILE" logs -f
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  pull       Pull latest images"
    echo "  migrate    Run database migrations"
    echo "  deploy     Full deployment (pull, migrate, restart)"
    echo "  rollback   Rollback to previous version"
    echo "  health     Check service health"
    echo "  backup     Create database backup"
    echo "  logs [svc] View service logs"
    echo ""
    echo "Environment variables:"
    echo "  COMPOSE_FILE    Docker Compose file (default: docker-compose.prod.yml)"
    echo "  BACKUP_DIR      Backup directory (default: /opt/backups)"
    echo "  SKIP_BACKUP     Skip backup during deploy (default: false)"
    echo ""
}

# Main entry point
main() {
    check_docker

    case "${1:-}" in
        pull)
            pull_images
            ;;
        migrate)
            run_migrations
            ;;
        deploy)
            deploy
            ;;
        rollback)
            rollback
            ;;
        health)
            health_check
            ;;
        backup)
            create_backup
            ;;
        logs)
            view_logs "${2:-}"
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
