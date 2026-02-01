#!/usr/bin/env bash
#
# Raptor HR Ubuntu 24.04 Development Setup Script
# Installs all required development tools for native development
#
# Usage: ./setup-ubuntu.sh [OPTIONS]
#
# Options:
#   --skip-docker      Skip Docker installation
#   --skip-playwright  Skip Playwright system dependencies
#   --help             Show this help message
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Configuration
PYTHON_VERSION="3.12"
NODE_VERSION="20"
SKIP_DOCKER=false
SKIP_PLAYWRIGHT=false

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --skip-playwright)
                SKIP_PLAYWRIGHT=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
Raptor HR Ubuntu 24.04 Development Setup Script

Usage: ./setup-ubuntu.sh [OPTIONS]

Options:
  --skip-docker      Skip Docker installation
  --skip-playwright  Skip Playwright system dependencies
  --help             Show this help message

This script installs:
  - Python $PYTHON_VERSION (via pyenv)
  - Node.js $NODE_VERSION (via nvm)
  - Docker and Docker Compose v2
  - Development tools (ripgrep, fd, gh CLI)
  - Playwright browser dependencies

The script is idempotent and safe to run multiple times.
EOF
}

check_ubuntu_version() {
    log_step "Checking Ubuntu version..."

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" != "ubuntu" ]]; then
            log_warn "This script is designed for Ubuntu. Detected: $ID"
            log_warn "Proceeding anyway, but some commands may fail."
        elif [[ "$VERSION_ID" != "24.04" ]]; then
            log_warn "This script is optimized for Ubuntu 24.04. Detected: $VERSION_ID"
            log_warn "Proceeding anyway, but some packages may differ."
        else
            log_info "Ubuntu 24.04 detected"
        fi
    else
        log_warn "Could not detect OS version"
    fi
}

install_system_packages() {
    log_step "Installing system packages..."

    sudo apt-get update
    sudo apt-get install -y \
        build-essential \
        libpq-dev \
        postgresql-client \
        redis-tools \
        git \
        make \
        curl \
        wget \
        unzip \
        jq \
        tree \
        htop \
        procps \
        ca-certificates \
        gnupg \
        lsb-release \
        libssl-dev \
        zlib1g-dev \
        libbz2-dev \
        libreadline-dev \
        libsqlite3-dev \
        libncursesw5-dev \
        xz-utils \
        tk-dev \
        libxml2-dev \
        libxmlsec1-dev \
        libffi-dev \
        liblzma-dev

    log_info "System packages installed"
}

install_docker() {
    if $SKIP_DOCKER; then
        log_info "Skipping Docker installation (--skip-docker)"
        return
    fi

    # Detect WSL2 and skip Docker installation
    if grep -qi microsoft /proc/version 2>/dev/null; then
        log_warn "WSL2 detected. Skipping Docker installation."
        log_info "Use Docker Desktop with WSL2 integration instead."
        log_info "See: Docker Desktop → Settings → Resources → WSL Integration"
        return
    fi

    log_step "Installing Docker..."

    # Check if Docker is already installed
    if command -v docker &> /dev/null; then
        local docker_version
        docker_version=$(docker --version 2>/dev/null || echo "unknown")
        log_info "Docker already installed: $docker_version"

        # Check if docker-compose-plugin is installed
        if docker compose version &> /dev/null; then
            log_info "Docker Compose v2 already installed"
            return
        fi
    fi

    # Remove old versions
    sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
    fi

    # Set up repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add current user to docker group
    if ! groups "$USER" | grep -q docker; then
        sudo usermod -aG docker "$USER"
        log_warn "Added $USER to docker group. You may need to log out and back in."
    fi

    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker

    log_info "Docker installed successfully"
}

install_pyenv() {
    log_step "Installing pyenv and Python $PYTHON_VERSION..."

    # Check if pyenv is already installed
    if [ -d "$HOME/.pyenv" ]; then
        log_info "pyenv already installed"
        export PYENV_ROOT="$HOME/.pyenv"
        export PATH="$PYENV_ROOT/bin:$PATH"
        eval "$(pyenv init -)"
    else
        # Install pyenv
        curl -fsSL https://pyenv.run | bash

        # Set up environment for current session
        export PYENV_ROOT="$HOME/.pyenv"
        export PATH="$PYENV_ROOT/bin:$PATH"
        eval "$(pyenv init -)"
    fi

    # Check if Python version is already installed
    if pyenv versions | grep -q "$PYTHON_VERSION"; then
        log_info "Python $PYTHON_VERSION already installed"
    else
        log_info "Installing Python $PYTHON_VERSION (this may take a few minutes)..."
        pyenv install "$PYTHON_VERSION"
    fi

    # Set global Python version
    pyenv global "$PYTHON_VERSION"

    log_info "Python $(python --version) installed via pyenv"
}

install_nvm() {
    log_step "Installing nvm and Node.js $NODE_VERSION..."

    # Check if nvm is already installed
    export NVM_DIR="$HOME/.nvm"
    if [ -d "$NVM_DIR" ]; then
        log_info "nvm already installed"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        # Install nvm
        curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

        # Load nvm for current session
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # Check if Node version is already installed
    if nvm ls "$NODE_VERSION" &> /dev/null; then
        log_info "Node.js $NODE_VERSION already installed"
    else
        log_info "Installing Node.js $NODE_VERSION..."
        nvm install "$NODE_VERSION"
    fi

    # Set default Node version
    nvm alias default "$NODE_VERSION"
    nvm use "$NODE_VERSION"

    log_info "Node.js $(node --version) installed via nvm"
}

install_dev_tools() {
    log_step "Installing developer tools..."

    # ripgrep
    if command -v rg &> /dev/null; then
        log_info "ripgrep already installed"
    else
        sudo apt-get install -y ripgrep
        log_info "ripgrep installed"
    fi

    # fd-find
    if command -v fdfind &> /dev/null || command -v fd &> /dev/null; then
        log_info "fd already installed"
    else
        sudo apt-get install -y fd-find
        # Create symlink for fd command (Ubuntu installs as fdfind)
        if [ ! -L "$HOME/.local/bin/fd" ] && [ ! -f "$HOME/.local/bin/fd" ]; then
            mkdir -p "$HOME/.local/bin"
            ln -sf "$(which fdfind)" "$HOME/.local/bin/fd"
        fi
        log_info "fd-find installed"
    fi

    # GitHub CLI
    if command -v gh &> /dev/null; then
        log_info "GitHub CLI already installed"
    else
        # Add GitHub CLI repository
        if [ ! -f /etc/apt/sources.list.d/github-cli.list ]; then
            curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
            sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
                sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
            sudo apt-get update
        fi
        sudo apt-get install -y gh
        log_info "GitHub CLI installed"
    fi

    log_info "Developer tools installed"
}

install_playwright_deps() {
    if $SKIP_PLAYWRIGHT; then
        log_info "Skipping Playwright dependencies (--skip-playwright)"
        return
    fi

    log_step "Installing Playwright system dependencies..."

    # Playwright requires various browser libraries
    sudo apt-get install -y \
        libnss3 \
        libnspr4 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libgbm1 \
        libasound2t64 \
        libpango-1.0-0 \
        libcairo2 \
        libatspi2.0-0 \
        libgtk-3-0 \
        fonts-liberation \
        xvfb

    log_info "Playwright system dependencies installed"
}

configure_shell() {
    log_step "Configuring shell environment..."

    local shell_configs=()

    # Detect which shells are available
    [ -f "$HOME/.bashrc" ] && shell_configs+=("$HOME/.bashrc")
    [ -f "$HOME/.zshrc" ] && shell_configs+=("$HOME/.zshrc")

    # If no config found, default to bashrc
    if [ ${#shell_configs[@]} -eq 0 ]; then
        shell_configs+=("$HOME/.bashrc")
        touch "$HOME/.bashrc"
    fi

    for config_file in "${shell_configs[@]}"; do
        log_info "Configuring $config_file..."

        # pyenv configuration
        if ! grep -q 'PYENV_ROOT' "$config_file" 2>/dev/null; then
            cat >> "$config_file" << 'EOF'

# pyenv configuration
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
EOF
            log_info "Added pyenv configuration to $config_file"
        fi

        # nvm configuration
        if ! grep -q 'NVM_DIR' "$config_file" 2>/dev/null; then
            cat >> "$config_file" << 'EOF'

# nvm configuration
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
EOF
            log_info "Added nvm configuration to $config_file"
        fi

        # Add ~/.local/bin to PATH for fd symlink
        if ! grep -q '.local/bin' "$config_file" 2>/dev/null; then
            cat >> "$config_file" << 'EOF'

# Local bin directory
export PATH="$HOME/.local/bin:$PATH"
EOF
            log_info "Added ~/.local/bin to PATH in $config_file"
        fi
    done

    log_info "Shell configuration complete"
}

print_summary() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Development Setup Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "Installed:"
    echo "  - Python $PYTHON_VERSION (via pyenv)"
    echo "  - Node.js $NODE_VERSION (via nvm)"
    if ! $SKIP_DOCKER; then
        echo "  - Docker + Docker Compose v2"
    fi
    echo "  - ripgrep (rg)"
    echo "  - fd-find (fd)"
    echo "  - GitHub CLI (gh)"
    if ! $SKIP_PLAYWRIGHT; then
        echo "  - Playwright system dependencies"
    fi
    echo ""
    echo -e "${YELLOW}IMPORTANT: To use the new tools, either:${NC}"
    echo "  1. Open a new terminal, or"
    echo "  2. Run: source ~/.bashrc (or ~/.zshrc)"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Verify installations:"
    echo "   python --version   # Should show $PYTHON_VERSION.x"
    echo "   node --version     # Should show v$NODE_VERSION.x"
    if ! $SKIP_DOCKER; then
        echo "   docker --version"
    fi
    echo ""
    echo "2. Clone and set up the project:"
    echo "   git clone <repo-url> rhr && cd rhr"
    echo ""
    echo "3. Install backend dependencies:"
    echo "   cd backend"
    echo "   python -m venv .venv"
    echo "   source .venv/bin/activate"
    echo "   pip install -e \".[dev]\""
    echo ""
    echo "4. Install frontend dependencies:"
    echo "   cd frontend"
    echo "   npm ci"
    echo ""
    echo "5. Start services:"
    echo "   make up       # Start all Docker services"
    echo "   make migrate  # Run database migrations"
    echo "   make seed     # Seed development data"
    echo ""
    echo "6. Run tests:"
    echo "   make test-be  # Backend tests"
    echo "   make test-fe  # Frontend tests"
    echo ""
    if ! $SKIP_DOCKER && ! groups "$USER" | grep -q docker; then
        echo -e "${YELLOW}NOTE: Log out and back in for Docker group changes to take effect.${NC}"
        echo ""
    fi
}

main() {
    echo "=========================================="
    echo "Raptor HR Ubuntu Development Setup"
    echo "=========================================="
    echo ""

    parse_args "$@"

    check_ubuntu_version
    install_system_packages
    install_docker
    install_pyenv
    install_nvm
    install_dev_tools
    install_playwright_deps
    configure_shell
    print_summary
}

main "$@"
