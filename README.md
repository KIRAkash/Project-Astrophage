# 🌌 Project Astrophage

> **「Navigate your codebase. Chart your architecture. Never lose context again.」**

```
      ✦  .  *  .      *        .     ✦       .    *      .     ✦
 .         A  S  T  R  O  P  H  A  G  E          .         *
*      .        .    ✦      .        *       .         .       *
  .  ✦    Enterprise OpenKB · AI Agents · GitOps · Real-Time       .
```

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Gemini](https://img.shields.io/badge/Gemini-Flash-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini)
[![Ollama](https://img.shields.io/badge/Ollama-Gemma%203-white?style=flat-square)](https://ollama.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](LICENSE)

---

## 🚀 What Is Project Astrophage?

**Project Astrophage is an autonomous, AI-driven knowledge base platform** that solves one of the most painful problems in software engineering: *documentation that goes stale the moment it is written.*

In any engineering organization — whether a 5-person startup or a 500-engineer enterprise — keeping architecture documentation in sync with the actual codebase is an endless, losing battle. Engineers do not have time to update wikis after every sprint. New joiners spend weeks piecing together how systems talk to each other. Teams operate in silos with no shared map of the architecture. Critical context lives only in the heads of the people who built the system, and walks out the door when they leave.

**Astrophage changes this entirely.**

It ingests your source code from GitHub, your product specs from Confluence, your feature definitions from Jira, and your design docs from Notion — then deploys a fleet of AI agents to compile everything into a structured, living **OpenKB** knowledge base, committed to a Git repository and opened as a Pull Request for your team to review. When your code changes, Astrophage notices, evaluates whether the change is significant enough to warrant a documentation update, and automatically generates and proposes the update as a new PR — all without any human intervention.

The result is a **continuously maintained, version-controlled, peer-reviewed architecture map** of your entire organization — automatically.

---

## ✨ Why This Will Change How Your Team Operates

- 🧠 **Zero-effort documentation** — Engineers write code; Astrophage writes the docs.
- 🔄 **Always in sync** — Every significant code change triggers a documentation review cycle automatically.
- 🌐 **Organizational awareness** — Synthesizes app-level KBs into an org-wide architecture map, giving leadership a real-time view of the entire system landscape.
- 📋 **Git-native workflow** — Docs live in version-controlled repos and go through the same PR review process as code. No more rogue Confluence pages with no change history.
- 🤝 **Human-in-the-loop by design** — AI proposes, humans approve. The merge is the publishing event.
- 🏢 **Scales with your org** — Supports unlimited nesting of teams and sub-teams, each with their own KB, all rolling up into a master organizational view.
- 🛡️ **Intelligent spam filter** — The Gatekeeper agent ensures trivial changes (typo fixes, color tweaks) never pollute your documentation history.
- 💰 **Three AI modes** — Run fully remote (Gemini), fully local (Gemma/Ollama, free), or hybrid (smart per-task routing to balance quality and cost).

---

## 🗺️ How It Works — The Three Flows

### Flow A — Initial Knowledge Base Generation

```
User submits App (Team + App Name + Source URLs)
         │
         ▼
  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
  │   INGESTOR      │───▶│    COMPILER      │───▶│    GITOPS       │
  │  (mode-aware)   │    │  (mode-aware)    │    │  (PyGitHub)     │
  │                 │    │                  │    │                 │
  │ · GitHub repos  │    │ · index.md       │    │ · Creates repo  │
  │ · Confluence    │    │ · summaries/     │    │ · Feature branch│
  │ · Notion pages  │    │ · concepts/      │    │ · Commits KB    │
  │ · Jira projects │    │ · entities/      │    │ · Opens PR →    │
  │ · File uploads  │    │ · decisions/     │    │   main          │
  └─────────────────┘    └──────────────────┘    └─────────────────┘
                                                          │
                                                  Status: "Awaiting Launch"
                                                  PR link shown in dashboard
                                                  Team reviews and merges
                                                  Webhook fires → "In Orbit" ✅
```

### Flow B — Continuous Sync (The Gatekeeper)

```
Engineer pushes commit to source repo
         │
         ▼
  GitHub push webhook fires → Astrophage API
         │
         ▼
  ┌──────────────────────────────────────────────┐
  │                 GATEKEEPER                   │
  │     (Gemma locally in local/hybrid mode,     │
  │      Gemini in remote mode)                  │
  │                                              │
  │  Analyses the exact code diff:               │
  │                                              │
  │  API signature changed?  → SIGNIFICANT ──────┼──▶ COMPILER (patch) → new PR
  │  New DB table added?     → SIGNIFICANT       │
  │  New microservice?       → SIGNIFICANT       │
  │                                              │
  │  Typo fix in a comment?  → TRIVIAL ──────────┼──▶ IGNORED (no noise)
  │  CSS color changed?      → TRIVIAL           │
  │  Test file added?        → TRIVIAL           │
  └──────────────────────────────────────────────┘
```

### Flow C — Organization-Level Rollup

```
Any app KB is merged (transitions to "In Orbit")
         │
         ▼
  Published apps in this Org >= 2?
         │ YES
         ▼
  ┌──────────────────┐
  │   ROLLUP AGENT   │  Reads all published app KBs, identifies shared
  │  (always Gemini) │  dependencies, resolves contradictions, builds
  │                  │  the cross-team architecture map
  └────────┬─────────┘
           │
           ▼
  PR opened on kb-org-[slug] repository
  Bubbles up recursively to parent org if nested hierarchy exists
  Dashboard shows org-level PR link alongside each app PR
```

---

## 🤖 The AI Agent Fleet

| Agent | File | Role |
|---|---|---|
| **Ingestor** | [`agents/ingestor.py`](apps/api/agents/ingestor.py) | Fetches source code and docs, runs mode-aware map-reduce summarisation to produce an architecture index |
| **Compiler** | [`agents/compiler.py`](apps/api/agents/compiler.py) | Synthesizes the architecture index into a full OpenKB directory using a wikilink-aware page manifest; routes pages to local or remote model in hybrid mode |
| **Gatekeeper** | [`agents/gatekeeper.py`](apps/api/agents/gatekeeper.py) | Classifies git diffs as `significant` or `trivial`; runs locally (Gemma) in local/hybrid mode to keep the cost of continuous monitoring near zero |
| **Rollup** | [`agents/rollup.py`](apps/api/agents/rollup.py) | Synthesises multiple app-level KBs into a single org-level architecture map; always uses Gemini regardless of AI_MODE (needs the widest context window) |
| **LLM Client** | [`agents/llm_client.py`](apps/api/agents/llm_client.py) | Shared singleton for all agents — wraps `google-genai` (Gemini) and Ollama (Gemma) with connection pooling, retries, semaphore-bounded batching, and `force_mode` routing |

---

## 🧠 AI Modes

Astrophage supports three modes, configurable via `AI_MODE` in your `.env`:

### `remote` (default)
All LLM calls go to **Gemini Flash** via the `google-genai` SDK. For small repos (under `REMOTE_INLINE_THRESHOLD` chars), the entire codebase is sent in a single Gemini context window — no map-reduce needed. For larger repos, map and reduce both run on Gemini with concurrent calls bounded by a semaphore.

### `local`
All LLM calls go to **Gemma via Ollama** — fully free, fully offline. The ingestor uses smaller chunks (`LOCAL_CHUNK_SIZE=6000` chars) with sequential, rolling-context summarisation to stay within Gemma's context limit. The compiler caps the documentation plan at `LOCAL_MAX_PAGES=6` and uses a tight per-page code budget. Wikilink repair after compilation is done with pure Python regex (no extra LLM call).

### `hybrid`
Smart per-task routing that balances cost and quality:

| Task | Routes to | Why |
|---|---|---|
| File summarisation (MAP phase) | 🏠 Gemma | Cheap, embarrassingly parallel — ideal for local |
| Architecture synthesis (REDUCE phase) | ☁️ Gemini | Needs to see all summaries at once with full context |
| `summaries/` and `entities/` pages | 🏠 Gemma | Narrow, code-grounded — low context need |
| `concepts/` and `decisions/` pages | ☁️ Gemini | Cross-cutting, architecture-level reasoning |
| Gatekeeper (diff classification) | 🏠 Gemma | Binary decision on a compact diff — free |
| Rollup | ☁️ Gemini | Must synthesise across multiple full KBs |
| Post-compilation synthesis pass | ☁️ Gemini | Cross-links all pages in one pass |

The routing is driven by the `_route_page(path)` function in the compiler, which reads `HYBRID_LOCAL_CATEGORIES` and `HYBRID_REMOTE_CATEGORIES` from config.

---

## 🔗 Wikilink-Aware Compilation

Every compiled KB page contains accurate `[[wikilinks]]` to other pages from the moment it is generated — no post-processing hallucinations. Here's how:

1. After the documentation **plan** is generated (step 2), a **page manifest** is built at zero LLM cost:
   ```
   [[index]] - High-level architecture overview
   [[summaries/api-spec]] - REST API endpoints and schemas
   [[entities/user]] - User entity model
   [[decisions/db-choice]] - Database technology selection
   ```
2. This manifest is **injected into every page's compilation prompt**, so the model knows exactly what other pages exist and what they cover.
3. A **synthesis pass** runs after all pages are compiled:
   - In `local` mode: pure Python regex removes any links to non-existent pages.
   - In `remote`/`hybrid` mode: a single Gemini call reviews all page previews and adds missing cross-references.

---

## 📁 OpenKB Output Structure

Every generated knowledge base follows the **Google OKF (Open Knowledge Format)** standard — plain Markdown files, fully Obsidian-compatible:

```
kb-[org-slug]-[app-name]/
├── index.md                  # Architecture overview + navigation table
├── summaries/
│   ├── api-spec.md           # All endpoints, auth, request/response schemas
│   ├── db-schema.md          # Tables, relationships, indexes
│   └── core-logic.md         # Key algorithms and business rules
├── concepts/
│   ├── business-logic.md     # Domain workflows and rules
│   └── data-flows.md         # How data moves through the system
├── entities/
│   ├── microservices.md      # Service inventory and responsibilities
│   ├── databases.md          # Database instances and configurations
│   └── integrations.md       # Third-party dependencies
└── decisions/
    └── adr-001-initial.md    # Initial Architecture Decision Record
```

All cross-references use `[[wikilinks]]` so the entire KB is navigable in Obsidian or any Markdown viewer.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        ASTROPHAGE PLATFORM                           │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────────────────────────┐   │
│  │   Next.js 14     │    │          FastAPI Backend              │   │
│  │  (App Router)    │◀──▶│                                      │   │
│  │                  │    │  ┌───────────┐  ┌─────────────────┐  │   │
│  │  · Dashboard     │    │  │  Routers  │  │  Agent Runner   │  │   │
│  │  · Org Tree      │    │  │  /orgs    │  │                 │  │   │
│  │  · KB Detail     │    │  │  /kb      │  │  LLMClient ────▶│  │   │
│  │  · Live SSE      │    │  │  /webhook │  │  Ingestor  ────▶│  │   │
│  └──────────────────┘    │  └───────────┘  │  Compiler  ────▶│  │   │
│                          │                 │  Gatekeeper ───▶│  │   │
│  ┌──────────────────┐    │  ┌───────────┐  │  Rollup    ────▶│  │   │
│  │   PostgreSQL     │    │  │  Celery   │  └─────────────────┘  │   │
│  │  (org tree,      │◀──▶│  │  Workers  │◀── Redis Broker        │   │
│  │   KB state,      │    │  └───────────┘                        │   │
│  │   event log)     │    └──────────────────────────────────────┘   │
│  └──────────────────┘                                               │
│  ┌──────────────────┐    ┌──────────────────────────────────────┐   │
│  │      GCS         │    │          External Services            │   │
│  │  (raw content    │    │  · GitHub API  (GitOps + Webhooks)   │   │
│  │   archives)      │    │  · Gemini Flash  (google-genai SDK)  │   │
│  └──────────────────┘    │  · Ollama / Gemma 3  (local, free)  │   │
│                          │  · Confluence / Notion / Jira APIs   │   │
│                          └──────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSE support, RSC, Cloud Run ready |
| **UI** | shadcn/ui + Tailwind CSS + Framer Motion | Space theme, accessible, animated |
| **Backend** | FastAPI (Python 3.12) | Async-native, ideal for AI/LLM workloads |
| **AI SDK** | `google-genai` v2.18+ | Official, actively maintained Google GenAI SDK |
| **AI — Remote** | Gemini Flash (via `google-genai`) | Ingestion, compilation, rollup — large context |
| **AI — Local** | Gemma 3 via Ollama | Gatekeeper, map-phase summaries — free, private |
| **Task Queue** | Celery + Redis | Durable async pipelines with retries |
| **Database** | PostgreSQL + async SQLAlchemy | Recursive org tree, KB state, events |
| **Git Integration** | PyGitHub (GitHub REST API) | Repo creation, branching, commits, PRs |
| **Storage** | Google Cloud Storage | Raw ingested content and KB archives |
| **Auth** | NextAuth.js v5 — GitHub OAuth | Single-click login, token for GitOps |
| **Containers** | Docker + Docker Compose | Full local dev stack in one command |
| **Monorepo** | Turborepo | Unified build pipeline, shared types |

---

---

## 🌡️ KB Status Lifecycle

| Status | Space Name | Meaning |
|---|---|---|
|  | 🌑 **In the Void** | Submitted, waiting for a Celery worker |
|  | ☄️ **Scanning Nebula** | Ingestor agent is reading source code and docs |
|  | 🌟 **Compiling Stars** | Compiler agent is synthesizing OpenKB Markdown |
|  | 💫 **Awaiting Launch** | PR is open on GitHub — awaiting human review |
|  | 🌍 **In Orbit** | PR merged, KB is live and monitored |

## ⚙️ Setup Guide

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Docker Desktop | Latest | `docker --version` |
| Node.js | 20+ | `node --version` |
| Python | 3.12+ | `python3 --version` |
| Ollama (desktop app) | Latest | [ollama.com](https://ollama.com) *(only required for local/hybrid mode)* |

---

### Step 1 — Clone & Configure Environment

```bash
git clone <your-repo-url> astrophage
cd astrophage

cp .env.example .env
# Open .env and fill in the values below
```

**Minimum required values:**

```bash
# ── AI Mode ──────────────────────────────────────
# "remote"  : Gemini only (default, fastest, needs GEMINI_API_KEY)
# "local"   : Gemma only via Ollama (free, needs Ollama running)
# "hybrid"  : Smart routing — best of both
AI_MODE=remote

# ── Google AI (required for remote / hybrid mode) ─
GEMINI_API_KEY=           # Get free at: aistudio.google.com
GEMINI_MODEL=gemini-2.0-flash

# ── Local Gemma (required for local / hybrid mode) ─
GEMMA_OLLAMA_URL=http://localhost:11434
GEMMA_MODEL=gemma3:12b   # Run: ollama pull gemma3:12b

# ── GitHub — GitOps (repo provisioning + PR creation) ─
GITHUB_APP_TOKEN=         # PAT with: repo, admin:repo_hook, workflow
GITHUB_DEFAULT_ORG=       # Your GitHub username or org name

# ── GitHub — OAuth (UI login) ─────────────────────
GITHUB_CLIENT_ID=         # From your GitHub OAuth App
GITHUB_CLIENT_SECRET=     # From your GitHub OAuth App

# ── Security ──────────────────────────────────────
NEXTAUTH_SECRET=          # Run: openssl rand -base64 32
WEBHOOK_SECRET=           # Run: openssl rand -base64 32
```

> **GitHub OAuth App:** [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App
> Set Callback URL to `http://localhost:3000/api/auth/callback/github`

> **GitHub PAT:** [github.com/settings/tokens](https://github.com/settings/tokens) → Fine-grained token
> Grant: `Contents` (read/write), `Webhooks` (read/write), `Pull requests` (read/write)

---

### Step 2 — Start Infrastructure

```bash
# Start Postgres and Redis
docker compose up postgres redis -d

# Verify
docker compose ps
```

**Ollama** *(local/hybrid mode only)*: Make sure the Ollama desktop app is running. Verify:

```bash
curl http://localhost:11434/api/tags
# You should see your model (e.g. gemma3:12b) listed
```

If you do not have a model yet:
```bash
ollama pull gemma3:12b
```

---

### Step 3 — Start the API

```bash
cd apps/api

python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: [http://localhost:8000](http://localhost:8000)
- Swagger docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Step 4 — Start the Celery Worker

Open a **new terminal** in `apps/api` with the venv activated:

```bash
source .venv/bin/activate
celery -A workers.tasks worker --loglevel=info
```

---

### Step 5 — Start the Frontend

```bash
cd apps/web

npm install

# Initialize shadcn/ui (one-time, generates component files)
npx shadcn@latest init --defaults --yes
npx shadcn@latest add button card badge input label select separator skeleton table tabs dialog --yes

npm run dev
```

Frontend: [http://localhost:3000](http://localhost:3000)

---

### Step 6 — Enable Push Webhooks for Continuous Sync

Expose port 8000 publicly using [ngrok](https://ngrok.com):

```bash
ngrok http 8000
```

Set the URL in `.env` and restart the API:

```bash
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
SOURCE_MONITOR_MODE=webhook
```

> **No ngrok?** Use polling mode instead:
> ```bash
> # In .env:
> SOURCE_MONITOR_MODE=polling
>
> # Start Celery Beat (new terminal, same venv):
> celery -A workers.tasks beat --loglevel=info
> ```
> Astrophage will check source repos every 5 minutes automatically.

---

### Step 7 — Launch Your First Knowledge Base 🎉

1. Open [http://localhost:3000](http://localhost:3000) → sign in with GitHub
2. **Organizations** → **New Organization** → create your first org
3. Inside the org → **Add Application**
4. Enter an App Name, add your source URLs (GitHub repo, Confluence, etc.)
5. Click **Launch** and watch the status animate live on the dashboard
6. When status reaches **💫 Awaiting Launch**, click the PR link → review on GitHub → merge
7. Watch status flip to **🌍 In Orbit** ✅
8. Add a second app to the same org and Astrophage will automatically generate the org-level rollup KB

---

## 🐳 Running the Full Stack with Docker

To run everything (API + Worker + Web + Postgres + Redis) in containers:

```bash
docker compose up --build
```

> Add `GEMMA_OLLAMA_URL=http://host.docker.internal:11434` to `.env` so containers can reach your host Ollama instance.

---

## ⚙️ Advanced Configuration

All tuning knobs live in [`apps/api/core/config.py`](apps/api/core/config.py) and can be overridden in `.env`:

```bash
# ── Local mode tuning ────────────────────────────
LOCAL_MAX_FILES=150          # Max files ingested (protects Gemma VRAM)
LOCAL_CHUNK_SIZE=6000        # Chars per map-reduce chunk (~fits 8k num_ctx)
LOCAL_MAX_PAGES=6            # Max pages in the documentation plan
LOCAL_PAGE_TOKEN_BUDGET=20000  # Max chars of code context per page (~5k tokens)

# ── Remote mode tuning ───────────────────────────
REMOTE_SEMAPHORE_LIMIT=8     # Max concurrent Gemini calls (prevents 429s)
REMOTE_INLINE_THRESHOLD=800000  # Repos under this skip map-reduce entirely
REMOTE_MAX_PAGES=25          # Max pages in the documentation plan

# ── Hybrid mode tuning ───────────────────────────
HYBRID_LOCAL_CATEGORIES=summaries,entities   # KB dirs compiled by Gemma
HYBRID_REMOTE_CATEGORIES=concepts,decisions  # KB dirs compiled by Gemini
HYBRID_ENABLE_SYNTHESIS_PASS=true            # Gemini cross-link repair pass
```

---

## 📂 Monorepo Structure

```
astrophage/
├── apps/
│   ├── api/                          # FastAPI backend
│   │   ├── agents/                   # Ingestor, Compiler, Gatekeeper, Rollup, LLM Client
│   │   ├── core/                     # Config + security (HMAC, JWT)
│   │   ├── db/                       # SQLAlchemy models, schemas, async engine
│   │   ├── routers/                  # API route handlers (orgs, kb, webhooks)
│   │   ├── services/                 # GitOps, GCS, SSE, source ingestion adapters
│   │   └── workers/                  # Celery tasks + polling
│   └── web/                          # Next.js 14 frontend
│       ├── app/                      # App Router pages (dashboard, orgs, kb)
│       ├── components/               # UI components + space/ theme components
│       └── lib/                      # Typed API client, SSE hook, NextAuth config
├── packages/
│   └── shared-types/                 # Shared TypeScript interfaces
├── docker-compose.yml
├── turbo.json
└── .env.example
```

---

## 🤝 Contributing

Contributions are very welcome! Please open an issue first to discuss what you would like to change. All PRs should include tests and follow the existing code style.

---

## 📄 License

MIT © Project Astrophage

---

<p align="center">
  <i>Built with 🌌 and a deep belief that documentation should write itself.</i>
</p>
