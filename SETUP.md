# 🌌 Project Astrophage - Local Setup Guide

Welcome to the local setup guide for Project Astrophage! This guide provides detailed instructions on how to set up the project on your local machine for development and testing.

For a fast, interactive setup, you can use the provided bash script:
```bash
./scripts/local_setup.sh
```

If you prefer to configure things manually, or want a deeper understanding of the configuration, follow the manual setup guide below.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- **Docker Desktop** (latest) - for running PostgreSQL and Redis.
- **Node.js** (v20+) - for the Next.js frontend.
- **Python** (v3.12+) - for the FastAPI backend.
- **Ollama** - *Optional*, only required if you plan to use `local` or `hybrid` AI modes.

---

## 🔐 Environment Configuration

Project Astrophage uses a `.env` file at the root of the repository for all configuration.

Start by copying the example file:
```bash
cp .env.example .env
```

### 1. Compulsory Settings (Required for basic functionality)

These settings MUST be configured for the application to start and for you to log in.

**AI Mode & LLM Keys**
You must choose an AI mode and provide the corresponding API keys or local endpoint.
- `AI_MODE`: Choose `remote`, `local`, or `hybrid`.
  - If `remote` or `hybrid`: Set `GEMINI_API_KEY` (Get it from [Google AI Studio](https://aistudio.google.com/)).
  - If `local` or `hybrid`: Set `GEMMA_OLLAMA_URL` (usually `http://localhost:11434`) and ensure you have pulled the model (`ollama pull gemma3`).

**GitHub Integration (Required for Login & GitOps)**
Astrophage uses GitHub OAuth for user authentication and a Personal Access Token (PAT) for provisioning knowledge base repositories.
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: Create an OAuth App in your GitHub Developer Settings. Set the callback URL to `http://localhost:3000/api/auth/callback/github`.
- `GITHUB_APP_TOKEN`: A fine-grained GitHub PAT with `Contents` (R/W), `Webhooks` (R/W), and `Pull requests` (R/W) permissions.
- `GITHUB_DEFAULT_ORG`: The default GitHub organization or username where Astrophage will create knowledge base repositories.

**Security Secrets**
These are required to secure webhooks and user sessions. You can generate them using `openssl rand -base64 32`.
- `NEXTAUTH_SECRET`
- `WEBHOOK_SECRET`

**Local URLs**
- `NEXT_PUBLIC_API_URL`: Usually `http://localhost:8000`
- `NEXTAUTH_URL`: Usually `http://localhost:3000`

### 2. Optional Settings (Integrations)

The following keys are **strictly optional**. You only need to configure them if you want Astrophage to ingest documentation from these specific third-party sources. If you are just testing Astrophage with GitHub code repositories, you can leave these blank.

- `CONFLUENCE_API_TOKEN`: Atlassian API token for Confluence ingestion.
- `JIRA_API_TOKEN`: Atlassian API token for Jira ticket ingestion.
- `NOTION_API_TOKEN`: Internal integration token for Notion ingestion.
- `SLACK_BOT_TOKEN` & `SLACK_SIGNING_SECRET`: For Slack channel message ingestion.
- `GOOGLE_APPLICATION_CREDENTIALS` & `GCS_BUCKET_NAME`: By default, Astrophage will fall back to local disk storage (`logdir/archives/`) if Google Cloud Storage is not configured.

---

## 🚀 Manual Setup Steps

### Step 1: Start Infrastructure (Database & Redis)

Project Astrophage requires PostgreSQL for storing organizational state and Redis for Celery task queuing. You can easily start these using Docker:

```bash
docker compose up postgres redis -d
```

### Step 2: Install Dependencies

The project provides a convenient Makefile command to set up both the Python backend and Node.js frontend dependencies:

```bash
make install
```
*(This will create a Python virtual environment in `apps/api/.venv` and install `npm` modules in `apps/web`)*

### Step 3: Start the Application

You can start all background services (API, Celery Worker, Celery Beat, and Next.js Web Frontend) simultaneously using the Makefile:

```bash
make start-all
```

To view the live logs of all services:
```bash
make logs
```

### Step 4: Access the Dashboard

Once all services are running, open your browser and navigate to:
**http://localhost:3000**

You can now log in using your GitHub account and launch your first Knowledge Base!

---

## 🛑 Stopping the Services

When you are done developing, you can gracefully stop all background services (API, Workers, Web):

```bash
make stop-all
```

To stop the Docker infrastructure (Postgres & Redis):

```bash
make stop-infra
```
