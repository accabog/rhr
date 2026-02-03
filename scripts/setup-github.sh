#!/bin/bash
#
# Raptor HR GitHub Setup Script
# Sets up GitHub environments and secrets for CI/CD
#
# Prerequisites:
#   - GitHub CLI (gh) installed and authenticated
#   - Repository admin access
#
# Usage: ./setup-github.sh
#

set -e

# Configuration
REPO="${GITHUB_REPOSITORY:-accabog/rhr}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed"
        echo "Install it from: https://cli.github.com/"
        exit 1
    fi

    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated"
        echo "Run: gh auth login"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

# Create GitHub environment
create_environment() {
    local env_name="$1"
    local wait_timer="${2:-0}"
    local reviewers="${3:-}"

    log_info "Creating environment: $env_name"

    # Create environment using GitHub API
    gh api \
        --method PUT \
        -H "Accept: application/vnd.github+json" \
        "/repos/$REPO/environments/$env_name" \
        -f wait_timer="$wait_timer" \
        2>/dev/null || true

    # Add reviewers if specified (requires team or user IDs)
    if [ -n "$reviewers" ]; then
        log_info "  Note: Add reviewers manually in Settings > Environments > $env_name"
    fi

    log_info "  Environment '$env_name' created"
}

# Create repository secret
create_secret() {
    local name="$1"
    local value="$2"
    local env="${3:-}"

    if [ -n "$env" ]; then
        log_info "Creating environment secret: $name (in $env)"
        echo -n "$value" | gh secret set "$name" --env "$env" --repo "$REPO"
    else
        log_info "Creating repository secret: $name"
        echo -n "$value" | gh secret set "$name" --repo "$REPO"
    fi
}

# Prompt for secret value
prompt_secret() {
    local name="$1"
    local description="$2"
    local env="${3:-}"

    echo ""
    echo -e "${YELLOW}$name${NC}: $description"
    read -s -p "Enter value (or press Enter to skip): " value
    echo ""

    if [ -n "$value" ]; then
        create_secret "$name" "$value" "$env"
    else
        log_warn "Skipped: $name"
    fi
}

# Main setup
main() {
    echo "=================================="
    echo "Raptor HR GitHub Setup"
    echo "=================================="
    echo ""

    check_prerequisites

    echo ""
    echo "This script will set up:"
    echo "  1. GitHub Environments (staging, production)"
    echo "  2. Repository secrets for deployment"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi

    # Create environments
    echo ""
    log_info "Creating environments..."
    create_environment "staging" 0
    create_environment "production" 0

    echo ""
    log_info "Environments created. Configure protection rules manually:"
    echo "  1. Go to: https://github.com/$REPO/settings/environments"
    echo "  2. For 'production' environment:"
    echo "     - Add required reviewers"
    echo "     - Optionally restrict to 'main' branch"
    echo ""

    # Prompt for secrets
    echo ""
    log_info "Setting up deployment secrets..."
    echo "You can skip secrets and add them later in GitHub Settings."
    echo ""

    # Staging secrets
    echo "--- Staging Environment Secrets ---"
    prompt_secret "STAGING_HOST" "Staging server hostname or IP" "staging"
    prompt_secret "STAGING_USER" "SSH username for staging server" "staging"
    prompt_secret "STAGING_SSH_KEY" "SSH private key for staging (paste entire key)" "staging"

    # Production secrets
    echo ""
    echo "--- Production Environment Secrets ---"
    prompt_secret "PRODUCTION_HOST" "Production server hostname or IP" "production"
    prompt_secret "PRODUCTION_USER" "SSH username for production server" "production"
    prompt_secret "PRODUCTION_SSH_KEY" "SSH private key for production (paste entire key)" "production"

    # Application secrets (repository-level)
    echo ""
    echo "--- Application Secrets (shared) ---"
    prompt_secret "SECRET_KEY" "Django SECRET_KEY for production"
    prompt_secret "POSTGRES_PASSWORD" "PostgreSQL password for production"

    echo ""
    echo "=================================="
    log_info "Setup complete!"
    echo "=================================="
    echo ""
    echo "Next steps:"
    echo "  1. Configure environment protection rules at:"
    echo "     https://github.com/$REPO/settings/environments"
    echo ""
    echo "  2. Add any skipped secrets via:"
    echo "     https://github.com/$REPO/settings/secrets/actions"
    echo ""
    echo "  3. Generate SSL certificates and deploy to servers"
    echo ""
    echo "  4. Push to main to trigger first staging deployment"
    echo ""
}

main "$@"
