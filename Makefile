.PHONY: help install start-infra stop-infra start-api start-worker start-beat start-web start-all stop-all clean-logs logs create-log-dir

# Central log directory
LOG_DIR := logdir

help:
	@echo "Project Astrophage - Makefile Commands"
	@echo "--------------------------------------------------------"
	@echo "make install      - Install all dependencies (backend & frontend)"
	@echo "make start-infra  - Start Postgres & Redis (Homebrew or Docker)"
	@echo "make stop-infra   - Stop Docker infrastructure"
	@echo "make start-all    - Start all services (Infra, API, Worker, Beat, Web) and log to ./logs"
	@echo "make stop-all     - Stop all running background services"
	@echo "make logs         - Tail all logs simultaneously"
	@echo "make clean-logs   - Clear all log files"

create-log-dir:
	@mkdir -p logdir

install:
	cd apps/api && (python3.12 -m venv .venv 2>/dev/null || python3 -m venv .venv)
	cd apps/api && . .venv/bin/activate && pip install -r requirements.txt
	cd apps/web && npm install

start-infra:
	@echo "Starting Postgres and Redis..."
	@brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null || docker-compose up -d postgres redis
	@brew services start redis 2>/dev/null || true

stop-infra:
	@echo "Stopping Postgres and Redis..."
	@brew services stop postgresql@16 2>/dev/null || brew services stop postgresql 2>/dev/null || true
	@brew services stop redis 2>/dev/null || true
	@docker-compose down 2>/dev/null || true

start-api: create-log-dir
	@echo "Starting API..."
	@cd apps && . api/.venv/bin/activate && uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 > ../$(LOG_DIR)/api.log 2>&1 & echo $$! > $(LOG_DIR)/api.pid
	@echo "API started on port 8000. Logs in $(LOG_DIR)/api.log"

start-worker: create-log-dir
	@echo "Starting Celery worker..."
	@cd apps && . api/.venv/bin/activate && celery -A api.workers.tasks worker --loglevel=info > ../$(LOG_DIR)/worker.log 2>&1 & echo $$! > $(LOG_DIR)/worker.pid
	@echo "Celery worker started. Logs in $(LOG_DIR)/worker.log"

start-beat: create-log-dir
	@echo "Starting Celery beat..."
	@cd apps && . api/.venv/bin/activate && celery -A api.workers.tasks beat --loglevel=info > ../$(LOG_DIR)/beat.log 2>&1 & echo $$! > $(LOG_DIR)/beat.pid
	@echo "Celery beat started. Logs in $(LOG_DIR)/beat.log"

start-web: create-log-dir
	@echo "Starting Web frontend..."
	@cd apps/web && npm run dev > ../../$(LOG_DIR)/web.log 2>&1 & echo $$! > $(LOG_DIR)/web.pid
	@echo "Web frontend started on port 3000. Logs in $(LOG_DIR)/web.log"

start-all: start-infra start-api start-worker start-beat start-web
	@echo "All services started! Run 'make logs' to view output."

stop-all:
	@for pidfile in $(LOG_DIR)/*.pid; do \
		if [ -f $$pidfile ]; then \
			PID=$$(cat $$pidfile); \
			kill -TERM $$PID 2>/dev/null || true; \
			pkill -P $$PID 2>/dev/null || true; \
			kill -9 $$PID 2>/dev/null || true; \
			rm $$pidfile; \
		fi \
	done
	@# Fallback: forcefully kill orphaned Next.js and FastAPI servers
	@lsof -t -i:3000 | xargs kill -9 2>/dev/null || true
	@lsof -t -i:8000 | xargs kill -9 2>/dev/null || true
	@pkill -f "celery -A workers.tasks" 2>/dev/null || true
	@echo "All background services stopped."

clean-logs:
	rm -rf $(LOG_DIR)/*

logs: create-log-dir
	@touch $(LOG_DIR)/api.log $(LOG_DIR)/worker.log $(LOG_DIR)/beat.log $(LOG_DIR)/web.log
	tail -f $(LOG_DIR)/*.log
