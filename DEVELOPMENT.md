# CircuitMind — Development Guide

## Prerequisites

- Node.js 20+
- Python 3.12+
- Docker + Docker Compose
- An Anthropic API key

## Quick Start

### 1. Environment

```bash
cd circuitmind
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY, POSTGRES_PASSWORD, REDIS_PASSWORD
```

### 2. Start infrastructure

```bash
cd infra
docker compose up postgres redis -d
```

### 3. Backend

```bash
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Run migrations (schema is in infra/postgres/init.sql — already applied by Docker)
# For subsequent changes:
# alembic revision --autogenerate -m "description"
# alembic upgrade head

# Seed component database
python ../../scripts/seed_components.py

# Start API server
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000

---

## Docker Compose (full stack)

```bash
cd infra
docker compose up --build
```

Services:
- http://localhost:3000 — Next.js frontend
- http://localhost:8000 — FastAPI backend
- http://localhost:8000/docs — Swagger UI
- http://localhost:80 — Nginx proxy (all-in-one)

---

## Project Structure

```
circuitmind/
├── apps/
│   ├── web/                  # Next.js 14 (App Router)
│   └── api/                  # FastAPI (Python 3.12)
├── packages/
│   └── circuit-ir/           # Canonical Circuit IR TypeScript types
├── infra/
│   ├── docker-compose.yml
│   ├── nginx/nginx.conf
│   └── postgres/init.sql
└── scripts/
    └── seed_components.py
```

## Architecture

### Data flow

```
User (NL prompt)
    ↓ WebSocket { type: "generate", prompt }
FastAPI /ws/projects/{id}
    ↓
CircuitAgent (Claude API — tool use loop)
    ↓ tool calls
ToolExecutor (mutates CircuitIR in memory)
    ↓ JSON Patch messages over WS
Zustand store (applyIRPatch)
    ↓
Konva.js SchematicCanvas (re-renders)
    ↓
useSchematicLayout (auto-layout trigger)
```

### Circuit IR

The central JSON schema lives in `packages/circuit-ir/index.ts` (TypeScript)
and is mirrored in `apps/api/app/models/circuit_ir.py` (Pydantic).
**Always keep these in sync.**

### Claude agent tools

| Tool | Effect |
|------|--------|
| `add_component` | Appends Component to IR, auto-creates nets |
| `add_net` | Appends Net to IR |
| `connect_pins` | Updates pin→net mapping, creates Wire |
| `run_simulation` | Runs ngspice, streams results |
| `query_components` | Full-text search on component DB |

---

## Running Tests

```bash
# Backend
cd apps/api
pytest tests/ -v

# Type checking
mypy app/
```

---

## Phase 2 Checklist (not yet implemented)

- [ ] Authentication (NextAuth.js + users table)
- [ ] Orthogonal A* wire routing (`lib/layout/wireRouter.ts`)
- [ ] 3D component models (KiCad `.wrl` assets via Three.js GLTFLoader)
- [ ] Component database search UI panel
- [ ] RQ simulation job queue (currently synchronous)
- [ ] Deployment: Vercel (web) + Railway (api)
