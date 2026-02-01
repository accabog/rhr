# Development tooling container for VS Code Dev Containers
# This container provides IDE support, linting, and testing tools
# The actual backend/frontend services run in separate containers

FROM python:3.12-slim

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build essentials for Python packages
    build-essential \
    libpq-dev \
    # Node.js prerequisites
    curl \
    ca-certificates \
    gnupg \
    # Git and version control
    git \
    openssh-client \
    # Editors and pagers
    vim \
    less \
    # Database clients
    postgresql-client \
    redis-tools \
    # Essential CLI tools
    make \
    jq \
    tree \
    wget \
    unzip \
    # Process utilities
    procps \
    htop \
    # Network utilities
    dnsutils \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Install ripgrep (faster grep)
RUN curl -LO https://github.com/BurntSushi/ripgrep/releases/download/14.1.0/ripgrep_14.1.0-1_amd64.deb \
    && dpkg -i ripgrep_14.1.0-1_amd64.deb \
    && rm ripgrep_14.1.0-1_amd64.deb

# Install fd (faster find)
RUN curl -LO https://github.com/sharkdp/fd/releases/download/v10.1.0/fd_10.1.0_amd64.deb \
    && dpkg -i fd_10.1.0_amd64.deb \
    && rm fd_10.1.0_amd64.deb

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI (to interact with host Docker)
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian bookworm stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python development tools globally
RUN pip install --no-cache-dir \
    # Linting and formatting
    ruff \
    mypy \
    pre-commit \
    # Testing
    pytest \
    pytest-cov \
    pytest-django \
    pytest-asyncio \
    factory-boy \
    faker \
    # Django tools
    django-stubs \
    djangorestframework-stubs \
    django-extensions \
    # Interactive shell
    ipython \
    rich \
    # HTTP clients
    httpx \
    httpie \
    # Environment
    python-dotenv \
    # Type stubs
    types-requests \
    types-redis

# Install Node.js development tools globally
RUN npm install -g \
    typescript \
    ts-node \
    eslint \
    prettier \
    npm-check-updates \
    @types/node \
    @anthropic-ai/claude-code

# Create non-root user for development
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && rm -rf /var/lib/apt/lists/*

# Add user to docker group (for docker socket access)
RUN groupadd -f docker && usermod -aG docker $USERNAME

# Set up shell configuration for better experience
RUN echo 'alias ll="ls -la"' >> /home/$USERNAME/.bashrc \
    && echo 'alias rg="rg --smart-case"' >> /home/$USERNAME/.bashrc \
    && echo 'alias gs="git status"' >> /home/$USERNAME/.bashrc \
    && echo 'alias gd="git diff"' >> /home/$USERNAME/.bashrc \
    && echo 'export PYTHONDONTWRITEBYTECODE=1' >> /home/$USERNAME/.bashrc \
    && echo 'export PYTHONUNBUFFERED=1' >> /home/$USERNAME/.bashrc \
    && echo 'export PATH="$HOME/.local/bin:$PATH"' >> /home/$USERNAME/.bashrc

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER $USERNAME

# Set bash as default shell
ENV SHELL=/bin/bash
SHELL ["/bin/bash", "-c"]

# Keep container running
CMD ["sleep", "infinity"]
