TAG        ?= $(shell date +%Y%m%dT%H%M%S)
KUBE_CONTEXT ?= minikube
NAMESPACE  ?= celadon

BUILD_TAG  ?= latest

RELEASE    := celadon
CHART_DIR  := helm
VALUES_MINIKUBE := helm/values-minikube.yaml
DB_STATEFULSET  := celadon-database
DB_PVC          := data-celadon-database-0
APP_SERVICE     := celadon
APP_PORT        := 8080
SVC_PORT        := 80

GET_ENDPOINTS := / /purchaser /purchase /customer /sale /item

.PHONY: help test test-lint test-unit build \
        minikube-deploy minikube-deploy-full \
        minikube-remove minikube-remove-full \
        minikube-get

help:
	@echo "Usage: make <target> [VAR=value ...]"
	@echo ""
	@echo "Targets:"
	@echo "  test                    Run linter and unit tests"
	@echo "  test-lint               Run linter only (pycodestyle)"
	@echo "  test-unit               Run unit tests only (pytest)"
	@echo "  build [BUILD_TAG=latest]"
	@echo "                          Build the celadon Docker image"
	@echo "  minikube-deploy [TAG=<datetime>] [KUBE_CONTEXT=minikube] [NAMESPACE=celadon]"
	@echo "                          Build image and deploy to Minikube via Helm"
	@echo "  minikube-deploy-full [TAG=<datetime>] [KUBE_CONTEXT=minikube] [NAMESPACE=celadon]"
	@echo "                          Wipe DB data, then run minikube-deploy"
	@echo "  minikube-remove [KUBE_CONTEXT=minikube] [NAMESPACE=celadon]"
	@echo "                          Helm uninstall the release"
	@echo "  minikube-remove-full [KUBE_CONTEXT=minikube] [NAMESPACE=celadon]"
	@echo "                          Helm uninstall, delete DB PVC, remove all celadon images from Minikube and Docker"
	@echo "  minikube-get [KUBE_CONTEXT=minikube] [NAMESPACE=celadon]"
	@echo "                          Port-forward and smoke-test all GET endpoints"

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

# ---------------------------------------------------------------------------
# minikube-deploy
# ---------------------------------------------------------------------------
minikube-deploy:
	docker build -t "celadon:$(TAG)" .
	minikube image load "celadon:$(TAG)" --profile "$(KUBE_CONTEXT)"
	cp db/*.sql helm/files/
	helm upgrade --install "$(RELEASE)" "$(CHART_DIR)" \
		-f "$(VALUES_MINIKUBE)" \
		--kube-context "$(KUBE_CONTEXT)" \
		--namespace "$(NAMESPACE)" \
		--create-namespace \
		--set "application.image.tag=$(TAG)"

# ---------------------------------------------------------------------------
# minikube-deploy-full
# ---------------------------------------------------------------------------
minikube-deploy-full:
	kubectl --context "$(KUBE_CONTEXT)" -n "$(NAMESPACE)" \
		scale statefulset "$(DB_STATEFULSET)" --replicas=0 || true
	kubectl --context "$(KUBE_CONTEXT)" -n "$(NAMESPACE)" \
		delete pvc "$(DB_PVC)" --ignore-not-found
	$(MAKE) minikube-deploy TAG="$(TAG)" KUBE_CONTEXT="$(KUBE_CONTEXT)" NAMESPACE="$(NAMESPACE)"

# ---------------------------------------------------------------------------
# minikube-remove
# ---------------------------------------------------------------------------
minikube-remove:
	helm uninstall "$(RELEASE)" \
		--kube-context "$(KUBE_CONTEXT)" \
		--namespace "$(NAMESPACE)" \
		--ignore-not-found

# ---------------------------------------------------------------------------
# minikube-remove-full
# ---------------------------------------------------------------------------
minikube-remove-full:
	$(MAKE) minikube-remove KUBE_CONTEXT="$(KUBE_CONTEXT)" NAMESPACE="$(NAMESPACE)"
	kubectl --context "$(KUBE_CONTEXT)" -n "$(NAMESPACE)" \
		delete pvc "$(DB_PVC)" --ignore-not-found
	minikube image ls --profile "$(KUBE_CONTEXT)" 2>/dev/null \
		| grep 'celadon' \
		| xargs -r minikube image rm --profile "$(KUBE_CONTEXT)" 2>/dev/null || true
	docker rmi $$(docker images --filter=reference='celadon' --format '{{.Repository}}:{{.Tag}}') 2>/dev/null || true

# ---------------------------------------------------------------------------
# minikube-get
# ---------------------------------------------------------------------------
minikube-get:
	@kubectl --context "$(KUBE_CONTEXT)" -n "$(NAMESPACE)" \
		port-forward "svc/$(APP_SERVICE)" "$(APP_PORT):$(SVC_PORT)" &
	@PF_PID=$$!; \
	sleep 2; \
	SUCCESS=0; TOTAL=0; \
	for endpoint in $(GET_ENDPOINTS); do \
		TOTAL=$$((TOTAL + 1)); \
		STATUS=$$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$(APP_PORT)$${endpoint}"); \
		if [ "$${STATUS}" -ge 200 ] && [ "$${STATUS}" -lt 300 ]; then \
			echo "  OK  ($${STATUS}) $${endpoint}"; \
			SUCCESS=$$((SUCCESS + 1)); \
		else \
			echo "  FAIL ($${STATUS}) $${endpoint}"; \
		fi; \
	done; \
	kill "$${PF_PID}" 2>/dev/null || true; \
	echo ""; \
	echo "Result: $${SUCCESS}/$${TOTAL} endpoints succeeded"
