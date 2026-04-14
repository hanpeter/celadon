BUILD_TAG  ?= latest

DATABASE_URL          ?=
GOOGLE_CLIENT_ID      ?=
GOOGLE_CLIENT_SECRET  ?=
FLASK_SESSION_SIGNING_KEY ?=

APP_PORT := 9001

.PHONY: help test test-lint test-unit build run

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
