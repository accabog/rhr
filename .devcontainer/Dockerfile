# Development tooling container for VS Code Dev Containers
# Uses Microsoft's pre-built base image for faster builds
# Base image includes: Git, curl, vim, make, jq, sudo, and more
# Features add: Node.js, GitHub CLI, Docker CLI (see devcontainer.json)

FROM mcr.microsoft.com/devcontainers/python:3.12

# Install additional system packages not in base image (single layer)
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    redis-tools \
    ripgrep \
    fd-find \
    htop \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s $(which fdfind) /usr/local/bin/fd

# Install Playwright system dependencies for E2E testing
# These are required for running headless Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libnss3 libnspr4 libdbus-1-3 libatk1.0-0 \
    libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    libx11-6 libx11-xcb1 libxcb1 libxext6 \
    fonts-liberation fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Install Python development tools globally
# Note: pytest, factory-boy, django-stubs etc. are in project requirements
RUN pip install --no-cache-dir \
    ruff \
    mypy \
    pre-commit \
    ipython \
    rich \
    httpie

# Shell aliases for better developer experience
RUN echo 'alias ll="ls -la"' >> /home/vscode/.bashrc \
    && echo 'alias rg="rg --smart-case"' >> /home/vscode/.bashrc \
    && echo 'alias gs="git status"' >> /home/vscode/.bashrc \
    && echo 'alias gd="git diff"' >> /home/vscode/.bashrc \
    && echo 'export PYTHONDONTWRITEBYTECODE=1' >> /home/vscode/.bashrc \
    && echo 'export PYTHONUNBUFFERED=1' >> /home/vscode/.bashrc

WORKDIR /workspace

# Keep container running
CMD ["sleep", "infinity"]
