#!/bin/bash
#
# Raptor HR Server Setup Script
# Sets up a fresh Ubuntu server for running the RHR staging/production environment
#
# Usage: ./setup-server.sh
#
# This script should be run on a fresh Ubuntu 22.04 server (e.g., AWS Lightsail)
# It installs Docker, configures the environment, and prepares for deployment.
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/opt/rhr}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root or with sudo"
        exit 1
    fi
}

install_docker() {
    log_info "Installing Docker..."

    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Install prerequisites
    apt-get update
    apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # Add Docker's official GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Set up repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    log_info "Docker installed successfully"
}

install_certbot() {
    log_info "Installing Certbot for SSL certificates..."
    apt-get install -y certbot
    log_info "Certbot installed successfully"
}

install_utilities() {
    log_info "Installing utilities..."
    apt-get install -y \
        curl \
        git \
        htop \
        vim \
        unzip \
        fail2ban
    log_info "Utilities installed successfully"
}

setup_user() {
    local username="${1:-ubuntu}"

    log_info "Setting up user '$username' for Docker access..."

    # Add user to docker group
    usermod -aG docker "$username"

    log_info "User '$username' added to docker group"
    log_warn "User must log out and back in for group changes to take effect"
}

setup_directories() {
    log_info "Setting up directories..."

    # Create project directory
    mkdir -p "$PROJECT_DIR"
    mkdir -p "$PROJECT_DIR/nginx/ssl"
    mkdir -p "$BACKUP_DIR"

    # Set ownership
    chown -R ubuntu:ubuntu "$PROJECT_DIR"
    chown -R ubuntu:ubuntu "$BACKUP_DIR"

    log_info "Directories created"
}

setup_firewall() {
    log_info "Configuring firewall..."

    # Install ufw if not present
    apt-get install -y ufw

    # Allow SSH, HTTP, HTTPS
    ufw allow ssh
    ufw allow http
    ufw allow https

    # Enable firewall (non-interactive)
    echo "y" | ufw enable

    log_info "Firewall configured"
}

setup_fail2ban() {
    log_info "Configuring fail2ban..."

    # Create jail.local
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
EOF

    systemctl restart fail2ban
    systemctl enable fail2ban

    log_info "fail2ban configured"
}

setup_ssl() {
    local domain="${1:-}"

    if [ -z "$domain" ]; then
        log_warn "No domain provided, skipping SSL setup"
        log_info "Run 'sudo certbot certonly --standalone -d YOUR_DOMAIN' later"
        return
    fi

    log_info "Setting up SSL certificate for $domain..."

    # Stop any service using port 80
    docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" down 2>/dev/null || true

    # Get certificate
    certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --email admin@"$domain"

    # Copy certificates
    cp /etc/letsencrypt/live/"$domain"/fullchain.pem "$PROJECT_DIR/nginx/ssl/"
    cp /etc/letsencrypt/live/"$domain"/privkey.pem "$PROJECT_DIR/nginx/ssl/"
    chown -R ubuntu:ubuntu "$PROJECT_DIR/nginx/ssl"

    # Set up auto-renewal
    cat > /etc/cron.d/certbot-renew << EOF
0 3 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/$domain/*.pem $PROJECT_DIR/nginx/ssl/ && chown ubuntu:ubuntu $PROJECT_DIR/nginx/ssl/*.pem && docker compose -f $PROJECT_DIR/docker-compose.prod.yml exec nginx nginx -s reload"
EOF

    log_info "SSL certificate installed"
}

clone_repository() {
    local repo_url="${1:-https://github.com/accabog/rhr.git}"

    log_info "Cloning repository..."

    if [ -d "$PROJECT_DIR/.git" ]; then
        log_info "Repository already exists, pulling latest..."
        cd "$PROJECT_DIR"
        sudo -u ubuntu git fetch origin main
        sudo -u ubuntu git checkout main
        sudo -u ubuntu git pull origin main
    else
        # Clean directory if it has files but no git repo (e.g., downloaded scripts)
        if [ "$(ls -A $PROJECT_DIR 2>/dev/null)" ]; then
            log_warn "Directory not empty, cleaning before clone..."
            rm -rf "$PROJECT_DIR"/*
            rm -rf "$PROJECT_DIR"/.[!.]* 2>/dev/null || true
        fi
        cd "$PROJECT_DIR"
        sudo -u ubuntu git clone "$repo_url" .
    fi

    log_info "Repository ready"
}

create_env_file() {
    log_info "Creating .env file template..."

    if [ -f "$PROJECT_DIR/.env" ]; then
        log_warn ".env file already exists, skipping"
        return
    fi

    # Generate secrets
    local secret_key=$(openssl rand -base64 50 | tr -dc 'a-zA-Z0-9' | head -c 50)
    local postgres_password=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

    cat > "$PROJECT_DIR/.env" << EOF
# Raptor HR Environment Configuration
# Generated by setup-server.sh

# Database Configuration
POSTGRES_DB=rhr
POSTGRES_USER=rhr
POSTGRES_PASSWORD=$postgres_password

# Django Configuration
SECRET_KEY=$secret_key
DEBUG=false
ALLOWED_HOSTS=localhost
CSRF_TRUSTED_ORIGINS=https://localhost

# Container Images (will be set by CI/CD)
BACKEND_IMAGE=ghcr.io/accabog/rhr-backend:latest
FRONTEND_IMAGE=ghcr.io/accabog/rhr-frontend:latest
EOF

    chown ubuntu:ubuntu "$PROJECT_DIR/.env"
    chmod 600 "$PROJECT_DIR/.env"

    log_info ".env file created"
    log_warn "IMPORTANT: Edit .env and update ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS with your domain"
}

print_summary() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Server Setup Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Configure your .env file:"
    echo "   nano $PROJECT_DIR/.env"
    echo "   - Update ALLOWED_HOSTS with your domain"
    echo "   - Update CSRF_TRUSTED_ORIGINS with your domain"
    echo ""
    echo "2. Set up SSL certificate (if not done):"
    echo "   sudo certbot certonly --standalone -d staging.yourdomain.com"
    echo "   sudo cp /etc/letsencrypt/live/staging.yourdomain.com/*.pem $PROJECT_DIR/nginx/ssl/"
    echo "   sudo chown ubuntu:ubuntu $PROJECT_DIR/nginx/ssl/*.pem"
    echo ""
    echo "3. Configure GitHub secrets for automated deployment:"
    echo "   - STAGING_HOST: your server's IP or hostname"
    echo "   - STAGING_USER: ubuntu"
    echo "   - STAGING_SSH_KEY: your SSH private key"
    echo ""
    echo "4. Enable staging deployments in GitHub:"
    echo "   - Add repository variable: STAGING_ENABLED=true"
    echo ""
    echo "5. Initial deployment:"
    echo "   cd $PROJECT_DIR"
    echo "   docker compose -f docker-compose.prod.yml pull"
    echo "   docker compose -f docker-compose.prod.yml up -d"
    echo "   docker compose -f docker-compose.prod.yml exec backend python manage.py migrate"
    echo "   docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
    echo ""
    echo "Useful commands:"
    echo "  View logs:    docker compose -f docker-compose.prod.yml logs -f"
    echo "  Restart:      docker compose -f docker-compose.prod.yml restart"
    echo "  Deploy:       $PROJECT_DIR/scripts/deploy.sh deploy"
    echo ""
}

# Main
main() {
    echo "=========================================="
    echo "Raptor HR Server Setup"
    echo "=========================================="
    echo ""

    check_root

    echo "This script will:"
    echo "  1. Update system packages"
    echo "  2. Install Docker and Docker Compose"
    echo "  3. Install Certbot for SSL"
    echo "  4. Configure firewall and fail2ban"
    echo "  5. Set up project directories"
    echo "  6. Clone the repository"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi

    # Prompt for domain
    echo ""
    read -p "Enter your domain (e.g., staging.raptorhr.com) or press Enter to skip SSL: " DOMAIN

    log_info "Starting server setup..."

    # Update system
    log_info "Updating system packages..."
    apt-get update && apt-get upgrade -y

    # Install components
    install_docker
    install_certbot
    install_utilities

    # Setup user and directories
    setup_user "ubuntu"
    setup_directories

    # Security
    setup_firewall
    setup_fail2ban

    # Clone repository
    clone_repository

    # Create environment file
    create_env_file

    # SSL setup
    if [ -n "$DOMAIN" ]; then
        setup_ssl "$DOMAIN"
    fi

    # Print summary
    print_summary
}

main "$@"
