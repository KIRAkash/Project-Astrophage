# Project Astrophage Architecture Map

This document outlines the high-level system architecture, data flows, and Google Cloud service integrations for Project Astrophage.

```mermaid
graph LR
    %% Custom Vibrant Styles
    classDef gcp fill:#4285F4,stroke:#fff,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef llm fill:#EA4335,stroke:#fff,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef local_llm fill:#d97706,stroke:#fff,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef source fill:#f59e0b,stroke:#fff,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef agent fill:#10b981,stroke:#fff,stroke-width:2px,color:#fff,rx:10px,ry:10px
    classDef core fill:#8b5cf6,stroke:#fff,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef router fill:#374151,stroke:#fff,stroke-width:2px,color:#fff,rx:30px,ry:30px
    classDef gate fill:#ef4444,stroke:#fff,stroke-width:2px,color:#fff,rx:8px,ry:8px

    %% ==========================================
    %% COLUMN 1: Extreme Left
    %% ==========================================
    subgraph Sources [🔌 Data Sources]
        GH[🐙 GitHub / Git]:::source
        Conf[📄 Confluence]:::source
        Notion[📓 Notion]:::source
        Slack[💬 Slack]:::source
        Jira[🎫 Jira]:::source
    end

    %% ==========================================
    %% COLUMN 2: Middle-Left
    %% ==========================================
    subgraph AppCore [⚙️ Platform Engine & Safety Gates]
        API[FastAPI Backend]:::core
        Celery[⚙️ Celery Workers & Redis]:::core
        AtomicDB[(🔒 Atomic Placeholder Registry)]:::gate
        Linter[🛡️ Pre-PR Linter Suite]:::gate
    end

    %% ==========================================
    %% COLUMN 3: Middle-Right
    %% ==========================================
    subgraph AI_Agents [🤖 AI Agent Fleet]
        Ingestor[Ingestor Agent]:::agent
        Gatekeeper[Gatekeeper Agent]:::agent
        Compiler[Compiler Agent]:::agent
        Rollup[Rollup Agent]:::agent
    end

    %% ==========================================
    %% COLUMN 4: Extreme Right
    %% ==========================================
    subgraph AIEngine [🧠 LLM Routing Layer]
        Router((AI Mode Router)):::router
        Gemini[✨ Google Gemini Flash Cloud]:::llm
        Gemma[🦙 Google Gemma Models Local]:::local_llm
    end

    %% ==========================================
    %% BOTTOM ROW: Cloud Foundation
    %% ==========================================
    subgraph GoogleCloud [☁️ Google Cloud Services]
        CloudRun[🚀 Cloud Run Web UI & Backend]:::gcp
        CloudSQL[(🗄️ Cloud SQL / PostgreSQL)]:::gcp
        GCS[(🪣 Cloud Storage Raw Archives)]:::gcp
    end

    %% ==========================================
    %% WIRING: THE MAIN CASCADE (Left to Right)
    %% ==========================================
    %% 1. Triggers (Forces Sources to the far left)
    GH -- Webhooks --> API
    Conf -- Webhooks --> API
    Notion -- Webhooks --> API
    Slack -- Webhooks --> API
    Jira -- Webhooks --> API
    
    %% 2. Execution (Pushes Core to the left of Agents)
    API -- Schedule Tasks --> Celery
    Celery --> Ingestor
    Celery --> Gatekeeper
    Celery --> Compiler
    Celery --> Rollup

    %% 3. Cognitive Processing (Pushes Router to the right of Agents)
    Ingestor -- Map/Reduce Extract --> Router
    Gatekeeper -- Evaluate Diff --> Router
    Compiler -- Synthesize KB --> Router
    Rollup -- Org Map Synthesis --> Router
    
    Router == Remote / Hybrid ==> Gemini
    Router == Local / Hybrid ==> Gemma

    %% ==========================================
    %% WIRING: SAFETY GATES & OUTPUTS
    %% ==========================================
    Ingestor -. 1a. Check/Reserve Slugs .-> AtomicDB
    Compiler -. 3a. Validate Format .-> Linter
    
    %% Feedback loops
    Linter -- 4. GitOps: Open PR --> GH
    Ingestor -- Save Snapshot --> GCS

    %% ==========================================
    %% WIRING: GOOGLE CLOUD (Bottom Anchors)
    %% ==========================================
    CloudRun -. Hosts .-> API
    API -. Reads/Writes .-> CloudSQL
```
