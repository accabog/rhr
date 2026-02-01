# RHR Development Makefile
# Run 'make help' to see available commands

# Use docker compose v2 syntax (docker compose) instead of v1 ($(DOCKER_COMPOSE))
DOCKER_COMPOSE := docker compose

.PHONY: help up down restart logs status \
        migrate migrations shell seed \
        test test-be test-fe test-cov \
        lint lint-be lint-fe format \
        build clean db-shell redis-cli

# Default target
help:
	@echo "RHR Development Commands"
	@echo ""
	@echo "Services:"
	@echo "  make up          Start all services"
	@echo "  make down        Stop all services"
	@echo "  make restart     Restart all services"
	@echo "  make logs        Follow service logs"
	@echo "  make status      Show service status"
	@echo ""
	@echo "Backend:"
	@echo "  make migrate     Run Django migrations"
	@echo "  make migrations  Create new migrations"
	@echo "  make shell       Open Django shell"
	@echo "  make seed        Seed development data"
	@echo ""
	@echo "Testing:"
	@echo "  make test        Run all tests"
	@echo "  make test-be     Run backend tests"
	@echo "  make test-fe     Run frontend tests"
	@echo "  make test-cov    Run backend tests with coverage"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint        Run all linters"
	@echo "  make lint-be     Run backend linter (ruff)"
	@echo "  make lint-fe     Run frontend linter (eslint)"
	@echo "  make format      Format all code"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell    Open PostgreSQL shell"
	@echo "  make redis-cli   Open Redis CLI"
	@echo ""
	@echo "Docker:"
	@echo "  make build       Rebuild all containers"
	@echo "  make clean       Remove containers and volumes"

# ============================================================
# Services
# ============================================================

up:
	$(DOCKER_COMPOSE) up -d
	@echo "Services started. Frontend: http://localhost:3000, Backend: http://localhost:8000"

down:
	$(DOCKER_COMPOSE) down

restart:
	$(DOCKER_COMPOSE) restart

logs:
	$(DOCKER_COMPOSE) logs -f

status:
	$(DOCKER_COMPOSE) ps

# ============================================================
# Backend Development
# ============================================================

migrate:
	$(DOCKER_COMPOSE) exec backend python manage.py migrate

migrations:
	$(DOCKER_COMPOSE) exec backend python manage.py makemigrations

shell:
	$(DOCKER_COMPOSE) exec backend python manage.py shell_plus

seed:
	$(DOCKER_COMPOSE) exec backend python manage.py seed_staging_data

# ============================================================
# Testing
# ============================================================

test: test-be test-fe

test-be:
	$(DOCKER_COMPOSE) exec backend pytest

test-fe:
	$(DOCKER_COMPOSE) exec frontend npm test

test-cov:
	$(DOCKER_COMPOSE) exec backend pytest --cov=apps --cov-report=html
	@echo "Coverage report: backend/htmlcov/index.html"

# ============================================================
# Code Quality
# ============================================================

lint: lint-be lint-fe

lint-be:
	$(DOCKER_COMPOSE) exec backend ruff check .

lint-fe:
	$(DOCKER_COMPOSE) exec frontend npm run lint

format:
	$(DOCKER_COMPOSE) exec backend ruff format .
	$(DOCKER_COMPOSE) exec frontend npm run format 2>/dev/null || echo "No format script in frontend"

# ============================================================
# Database
# ============================================================

db-shell:
	$(DOCKER_COMPOSE) exec db psql -U rhr -d rhr

redis-cli:
	$(DOCKER_COMPOSE) exec redis redis-cli

# ============================================================
# Docker
# ============================================================

build:
	$(DOCKER_COMPOSE) build

clean:
	$(DOCKER_COMPOSE) down -v --remove-orphans
	@echo "Containers and volumes removed"
