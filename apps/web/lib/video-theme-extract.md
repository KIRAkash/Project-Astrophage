# Astrophage Video Narrative, Design System & Theme Extraction

Extracted directly from the Remotion motion graphics video architecture in `apps/video/src/`.

---

## 1. Core Brand Identity & Positioning

- **Product Name:** ASTROPHAGE
- **Core Architecture:** OpenKB — The Autonomous Multi-KB Fabric for Enterprise Intelligence
- **Tagline:** Enterprise Intelligence, Orchestrated.
- **Audience:** Enterprise Leadership, Engineering Directors, Staff Architects, Admin
- **Positioning Statement:**
  "In a large enterprise, knowledge does not live in silos. Astrophage connects distributed codebases, specifications, incident logs, and architecture decisions into a synchronized, queryable knowledge mesh."
- **Key Brand Pillars:**
  1. `✦ MULTI-KB FABRIC` — Decoupled knowledge planes for every enterprise microservice
  2. `⚡ REAL-TIME SYNTHESIS` — Autonomous agents continuously ingesting commits, PRs, RFCs, and discussions
  3. `🛡️ VERIFIED ACCURACY` — Cross-service contract verification with zero hallucinations
  4. `🗂️ OPENKB ARCHITECTURE` — Standardized, queryable, interoperable semantic intelligence

---

## 2. Design System & Visual Language

### Color Palette Tokens
| Token | Hex / Value | Usage |
|---|---|---|
| `bgDark` | `#070B19` | Deep space canvas background |
| `bgDarker` | `#040711` | Obsidian void background |
| `bgCard` | `rgba(15, 23, 42, 0.75)` | Glassmorphic card surface |
| `bgCardHover` | `rgba(30, 41, 59, 0.85)` | Elevated interactive card surface |
| `cyan` | `#00D2FF` | Primary radiant brand accent |
| `blue` | `#0072FF` | Deep hyperdrive blue |
| `electricBlue` | `#38BDF8` | Energetic foreground highlights & lasers |
| `purple` | `#7928CA` | Nebula deep violet |
| `neonPurple` | `#B026FF` | Radiant magenta-purple photon glow |
| `magenta` | `#E056FD` | Secondary highlight gradient stop |
| `violet` | `#A855F7` | Cosmic lilac glow |
| `emerald` | `#10B981` | Settlement & verified system status |
| `amber` | `#F59E0B` | Event streams / Kafka / telemetry |
| `rose` | `#F43F5E` | Auth service / security alerts |
| `textPrimary` | `#FFFFFF` | Display headlines |
| `textSecondary` | `#94A3B8` | Technical descriptions |
| `textMuted` | `#64748B` | Subtitle captions & footnotes |

### Gradients
- **Astrophage Core:** `linear-gradient(135deg, #00D2FF 0%, #6366F1 50%, #B026FF 100%)`
- **Cyan Hyperdrive:** `linear-gradient(135deg, #00D2FF 0%, #0072FF 100%)`
- **Neon Cosmic:** `linear-gradient(135deg, #B026FF 0%, #E056FD 100%)`
- **Nebula Void:** `radial-gradient(ellipse at center, rgba(121, 40, 202, 0.25) 0%, rgba(0, 210, 255, 0.15) 45%, rgba(7, 11, 25, 0.95) 100%)`
- **Glass Shimmer:** `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)`

### Typography System
- **Display / Headlines:** `Space Grotesk`, `system-ui`, sans-serif (tracking `-0.02em` to `-0.03em`, weight `800`/`900`)
- **Mono / Eyebrows / Badges:** `JetBrains Mono`, monospace (uppercase, tracking `0.15em` to `0.35em`)
- **Body / Technical:** Inter / system-ui (clean, readable, `text-zinc-400` / `#94A3B8`)

### Glow & Shadow Directives
- **Cyan Glow:** `box-shadow: 0 0 35px rgba(0, 210, 255, 0.5), 0 0 70px rgba(0, 210, 255, 0.2)`
- **Purple Glow:** `box-shadow: 0 0 35px rgba(176, 38, 255, 0.5), 0 0 70px rgba(176, 38, 255, 0.2)`
- **Glass Card:** `background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(7, 11, 25, 0.92) 100%)`, border `1px solid rgba(0, 210, 255, 0.25)`, backdrop-filter `blur(16px)`

---

## 3. Narrative Architecture & Scene Storyboard

### Scene 1: The Disconnected Enterprise Fleet
- **Headline:** "In a large enterprise, knowledge does not live in silos."
- **Visual Metaphor:** Concentric orbital planes representing microservice planets:
  - **Order Matching** (`#00D2FF`) with orbiting GitHub, Confluence, Jira moons
  - **Auth Service** (`#F43F5E`) with orbiting GitHub, Slack, Notion moons
  - **Market Gateway** (`#B026FF`) with orbiting GitHub, Notion, Slack moons
  - **Compliance Monitor** (`#F59E0B`) with orbiting GitHub, Jira, Confluence moons
  - **Settlement Engine** (`#10B981`) with orbiting GitHub, Notion, Jira moons
- **Core Problem:** Every service holds its own knowledge (code, docs, events, decisions) disconnected from the rest of the org.

### Scene 2: The Limits of Traditional AI & Single-Repo Agents
- **Headlines:**
  - "AI Agents are trapped in single codebases."
  - "Tethered only to the raw repository, blind to specs, discussions, and docs."
  - "Raw code reading is exhausting and overwhelming."
- **Failure Modes Visualized:**
  - Overheating token buffers (100k+ tokens)
  - Missing specs causing hallucinated logic
  - Inability to query cross-service APIs
  - Exhaustive context flood without semantic structure

### Scene 3: The Dual-Plane Architecture & The Singularity
- **Headline:** "INTRODUCING ASTROPHAGE: OpenKB Architecture."
- **Visual Metaphor:**
  - **Lower Plane (Physical Substrate):** Code repos, Slack channels, Notion docs, Jira tickets.
  - **Updraft Conduits:** Real-time data streams lifting intelligence upward.
  - **Upper Plane (Knowledge Fabric):** Matching KB, Auth KB, Gateway KB, Compliance KB, Settlement KB revolving around the central **Astrophage Singularity Core**.
  - **Radial Laser Highways:** Instant semantic routing between KBs.

### Scene 4: Inter-KB Traversal & Intelligence Routing
- **Headlines:**
  - "The Agent Requests Context."
  - "Inter-Knowledge Base Traversal."
  - "Unified Multi-Service Intelligence."
- **Workflow:**
  1. A coding agent connects to Gateway KB to resolve an endpoint.
  2. Gateway KB queries Order Matching KB and Central Astrophage Core.
  3. Astrophage traverses cross-service lineage to verify the contract.
  4. Contract verification returns in milliseconds with verified accuracy.

### Scene 5: Autonomous Continuous Maintenance
- **Headline:** "Continuously Maintained by Agents."
- **Pillars:**
  1. **Real-time ingestion:** Auto-indexes code, docs, and RFCs as they merge.
  2. **Automated lineage:** Maps cross-KB dependencies continuously.
  3. **Zero overhead:** Stays synchronized without manual wiki curation.

### Scene 6: Brand Climax & System Capabilities
- **Emblem:** Official Astrophage Cosmic Sphere Emblem with cyan/purple accretion disks.
- **Wordmark:** ASTROPHAGE lockup.
- **Tagline:** ENTERPRISE INTELLIGENCE, ORCHESTRATED.

---

## 4. Source Integrations & Ecosystem
- **Code & Version Control:** GitHub, Git
- **Documentation & Wikis:** Confluence, Notion
- **Collaboration & Communications:** Slack, Jira
- **AI Ecosystem & Infrastructure:** Google Cloud, Gemini, Cloud Run, Cloud SQL, Firebase, Gemma
