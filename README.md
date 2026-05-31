# Rally

A self-hosted homelab operations and project management platform — a unified replacement for Vikunja + Wiki.js, designed specifically for the realities of running a homelab.

Rally connects projects, tasks, services, assets, changes, decisions, incidents, runbooks, docs, and maintenance windows in a single graph, then layers an optional OpenAI-compatible AI assistant on top for relationship suggestions, change summaries, and a unified search experience.

## Features

- **Projects & tasks** — Kanban-style tracking with project-scoped views and rich detail pages.
- **Service & asset inventory** — Track services, dependencies, hardware, and their status, with a dependency graph view.
- **Operational records** — Changes, incidents (with resolve flow), runbooks, decisions, and scheduled maintenance with optional auto-generated change records.
- **Documentation** — Tiptap-based rich text docs with review reminders, tags, and inline editing.
- **Unified timeline & search** — Every meaningful event flows into a global timeline and full-text search.
- **Webhook ingest** — Token-protected webhook endpoints to receive events from Uptime Kuma, Grafana, or anything else. Triaged in an Events inbox and convertible to a task, incident, or change.
- **AI assistance (optional)** — Any OpenAI-compatible endpoint (local LLMs included). Powers relationship suggestions, follow-up generation on task completion, change summarisation, and AI chat.
- **First-run onboarding** — Multi-step setup wizard with optional AI configuration and seed data.
- **Single-binary deployment** — Backend serves the built frontend; data lives in PocketBase.

## Tech stack

- **Backend** — Fastify 4, TypeScript (ESM), PocketBase SDK, Zod, JWT auth, OpenAI-compatible AI client.
- **Frontend** — React 18, Vite, TanStack Router + Query, Zustand, Tailwind CSS, Radix UI, Tiptap, cmdk.
- **Storage** — PocketBase (SQLite) for application data.

## Quick start (Docker)

```bash
cp .env.example .env
# edit .env and set JWT_SECRET to something long & random
docker compose up -d --build
```

Then open <http://localhost:3000> and complete the onboarding wizard.

PocketBase admin lives at <http://localhost:8090/_/> with the credentials in your `.env`.

## Local development

Requires Node.js 22+ and a running PocketBase instance on `http://localhost:8090`.

```bash
# install everything (npm workspaces)
npm install

# start backend (auto-reload)
npm run dev --workspace packages/backend

# in another terminal, start frontend (Vite dev server on :5173)
npm run dev --workspace packages/frontend
```

The frontend dev server proxies `/api` to `http://localhost:3000`.

## Environment variables

| Variable                    | Required        | Default                | Description                                          |
| --------------------------- | --------------- | ---------------------- | ---------------------------------------------------- |
| `PORT`                      | no              | `3000`                 | Backend HTTP port                                    |
| `POCKETBASE_URL`            | yes             | `http://localhost:8090` | PocketBase base URL                                  |
| `POCKETBASE_ADMIN_EMAIL`    | yes             | —                      | PocketBase admin email used to bootstrap the schema  |
| `POCKETBASE_ADMIN_PASSWORD` | yes             | —                      | PocketBase admin password                            |
| `JWT_SECRET`                | yes             | —                      | Signing secret for Rally session tokens              |
| `PUBLIC_DIR`                | no              | `packages/backend/public` | Where to look for the built frontend             |
| `AI_ENDPOINT`               | no              | —                      | Default AI endpoint (also configurable in Settings)  |
| `AI_API_KEY`                | no              | —                      | Default AI API key                                   |
| `AI_MODEL`                  | no              | —                      | Default AI model                                     |

A starter `.env.example` is included.

## Project structure

```
rally/
├── packages/
│   ├── backend/   # Fastify API + PocketBase schema bootstrap + AI proxy
│   └── frontend/  # React app (Vite)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Webhook usage

After creating a webhook in **Settings → Webhooks**, POST to:

```
POST /api/webhook/<token>
Content-Type: application/json

{ "title": "...", "body": "...", "event_type": "alert" }
```

Events appear in the **Events** inbox and can be archived, ignored, or converted to a task/incident/change.

## License

MIT.
