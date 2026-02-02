# RHR Development Makefile
# Run 'make help' to see available commands

# Use docker compose v2 syntax (docker compose) instead of v1 ($(DOCKER_COMPOSE))
DOCKER_COMPOSE := docker compose

.PHONY: help up down restart logs status \
        dev dev-services run-be run-fe \
        migrate migrations shell seed seed-e2e \
        test test-be test-fe test-e2e test-cov test-bench \
        lint lint-be lint-fe format \
        build clean refresh-frontend db-shell redis-cli

# Default target
help:
	@echo "RHR Development Commands"
	@echo ""
	@echo "Services:"
	@echo "  make up          Start all services (Docker)"
	@echo "  make down        Stop all services"
	@echo "  make restart     Restart all services"
	@echo "  make logs        Follow service logs"
	@echo "  make status      Show service status"
	@echo ""
	@echo "Dev Container (recommended for VS Code Dev Container):"
	@echo "  make dev         Start db/redis + backend/frontend natively (Ctrl+C stops all)"
	@echo "  make dev-services  Start only db and redis"
	@echo "  make run-be      Run backend natively (separate terminal)"
	@echo "  make run-fe      Run frontend natively (separate terminal)"
	@echo ""
	@echo "Backend:"
	@echo "  make migrate     Run Django migrations"
	@echo "  make migrations  Create new migrations"
	@echo "  make shell       Open Django shell"
	@echo "  make seed        Seed development data"
	@echo "  make seed-e2e    Seed E2E test data"
	@echo ""
	@echo "Testing:"
	@echo "  make test        Run all tests (unit)"
	@echo "  make test-be     Run backend tests"
	@echo "  make test-fe     Run frontend tests"
	@echo "  make test-e2e    Run E2E tests (Playwright)"
	@echo "  make test-cov    Run backend tests with coverage"
	@echo "  make test-bench  Run performance benchmarks"
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
	@echo "  make build             Rebuild all containers"
	@echo "  make clean             Remove containers and volumes"
	@echo "  make refresh-frontend  Rebuild frontend with fresh node_modules"

# ============================================================
# Services
# ============================================================

up:
	$(DOCKER_COMPOSE) up -d
	@echo "Services started. Frontend: http://localhost:3000, Backend: http://localhost:8000"

# ============================================================
# Dev Container Development (native backend/frontend)
# ============================================================
# Use these commands when running inside a Dev Container where
# Docker-in-Docker volume mounts don't work for app services.

dev: dev-services
	@echo ""
	@echo "Starting backend and frontend..."
	@echo "Press Ctrl+C to stop all services"
	@echo ""
	@(cd backend && exec uv run python manage.py runserver 0.0.0.0:8000) & BE_PID=$$!; \
	(cd frontend && exec npm run dev -- --host 0.0.0.0) & FE_PID=$$!; \
	trap "kill $$BE_PID $$FE_PID 2>/dev/null; $(DOCKER_COMPOSE) down; exit 0" INT TERM; \
	wait

dev-services:
	@echo "Starting database services..."
	@$(DOCKER_COMPOSE) up -d db redis
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "Database services ready:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Redis:      localhost:6379"

run-be:
	cd backend && uv run python manage.py runserver 0.0.0.0:8000

run-fe:
	cd frontend && npm run dev -- --host 0.0.0.0

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

seed-e2e:
	cd backend && uv run python manage.py seed_e2e_data

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

test-e2e:
	cd frontend && npm run test:e2e

test-e2e-ui:
	cd frontend && npm run test:e2e:ui

test-bench:
	cd backend && pytest tests/benchmarks/ -v --benchmark-only

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
	$(DOCKER_COMPOSE) exec frontend npm run lint:fix

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

refresh-frontend:
	$(DOCKER_COMPOSE) rm -sf frontend
	$(DOCKER_COMPOSE) build frontend
	$(DOCKER_COMPOSE) up -d frontend
	@echo "Frontend refreshed with new dependencies"
