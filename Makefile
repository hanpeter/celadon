BUILD_TAG  ?= latest

DATABASE_URL          ?=
GOOGLE_CLIENT_ID      ?=
GOOGLE_CLIENT_SECRET  ?=
FLASK_SESSION_SIGNING_KEY ?=

APP_PORT := 9001

.PHONY: help test test-lint test-unit build run db-migrate db-migrate-list db-migrate-rollback

help:
	@echo "Usage: make <target> [VAR=value ...]"
	@echo ""
	@echo "Targets:"
	@echo "  test                    Run linter and unit tests"
	@echo "  test-lint               Run linter only (pycodestyle)"
	@echo "  test-unit               Run unit tests only (pytest)"
	@echo "  build [BUILD_TAG=latest]"
	@echo "                          Build the celadon Docker image"
	@echo "  run [DATABASE_URL=...] [GOOGLE_CLIENT_ID=...] [GOOGLE_CLIENT_SECRET=...] [FLASK_SESSION_SIGNING_KEY=...]"
	@echo "                          Run the app locally with Flask dev server"
	@echo "  db-migrate [DATABASE_URL=...]"
	@echo "                          Apply pending database migrations"
	@echo "  db-migrate-list [DATABASE_URL=...]"
	@echo "                          List database migrations and their status"
	@echo "  db-migrate-rollback [DATABASE_URL=...]"
	@echo "                          Rollback the last database migration"

# ---------------------------------------------------------------------------
# run
# ---------------------------------------------------------------------------
run:
	@test -n "$(DATABASE_URL)"         || (echo "ERROR: DATABASE_URL is required"; exit 1)
	@test -n "$(GOOGLE_CLIENT_ID)"     || (echo "ERROR: GOOGLE_CLIENT_ID is required"; exit 1)
	@test -n "$(GOOGLE_CLIENT_SECRET)" || (echo "ERROR: GOOGLE_CLIENT_SECRET is required"; exit 1)
	@test -n "$(FLASK_SESSION_SIGNING_KEY)" || (echo "ERROR: FLASK_SESSION_SIGNING_KEY is required"; exit 1)
	DATABASE_URL="$(DATABASE_URL)" \
	GOOGLE_CLIENT_ID="$(GOOGLE_CLIENT_ID)" \
	GOOGLE_CLIENT_SECRET="$(GOOGLE_CLIENT_SECRET)" \
	FLASK_SESSION_SIGNING_KEY="$(FLASK_SESSION_SIGNING_KEY)" \
	poetry run flask --app celadon.server run --port $(APP_PORT)

# ---------------------------------------------------------------------------
# db-migrate
# ---------------------------------------------------------------------------
db-migrate:
	@test -n "$(DATABASE_URL)" || (echo "ERROR: DATABASE_URL is required"; exit 1)
	@echo "$(DATABASE_URL)" | grep -q 'options=.*search_path' \
	  || (echo "ERROR: DATABASE_URL must include ?options=-csearch_path%3D<schema>"; exit 1)
	CELADON_MIGRATIONS_DIR=$(PWD)/migrations poetry run celadon-migrate apply

db-migrate-list:
	@test -n "$(DATABASE_URL)" || (echo "ERROR: DATABASE_URL is required"; exit 1)
	CELADON_MIGRATIONS_DIR=$(PWD)/migrations poetry run celadon-migrate list

db-migrate-rollback:
	@test -n "$(DATABASE_URL)" || (echo "ERROR: DATABASE_URL is required"; exit 1)
	CELADON_MIGRATIONS_DIR=$(PWD)/migrations poetry run celadon-migrate rollback --count=1

# ---------------------------------------------------------------------------
# test
# ---------------------------------------------------------------------------
test-lint:
	poetry run pycodestyle

test-unit:
	poetry run pytest --cov=celadon --cov-report=term --cov-fail-under=80

test: test-lint test-unit

# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------
build:
	docker build -t "celadon:$(BUILD_TAG)" .
