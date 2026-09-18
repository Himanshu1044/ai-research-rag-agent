# AI Research & RAG Agent

An AI-powered research assistant that plans and runs multi-step web
research, retrieves relevant information from a user's private knowledge
base, remembers useful facts about the user across sessions, and produces
structured research reports with cited sources.

The agent decides for itself which tools to use — searching the web,
reading a page, querying the user's documents, or recalling saved
memories — and research runs asynchronously in the background so the API
never blocks on a long LLM workflow.

## What it does

- User authentication with JWT (register, login, profile)
- An agentic research loop with LLM tool calling (Cohere `command-a-plus`)
- Web search and web-page extraction as agent tools
- RAG over user-uploaded documents, chunked and embedded with Cohere
  `embed-v4.0`
- Vector similarity search over embeddings with PostgreSQL + pgvector
- Long-term memory: the agent can save and recall facts about the user
- Asynchronous research jobs processed with Redis + BullMQ, with retries
  and exponential backoff
- Persistent research reports and cited sources per research request
- Strict user-level data isolation on every query (documents, memories,
  research, reports)
- A React frontend for authentication, running research, and managing the
  knowledge base
- Docker Compose setup for the frontend, API, worker, and Redis

## Architecture

```text
React frontend
      │
      ▼
Express API ──────────────► PostgreSQL (+ pgvector)
      │                            ▲
      │ enqueue job                │
      ▼                            │
Redis + BullMQ                     │
      │                            │
      ▼                            │
Research Worker                    │
      │                            │
      ▼                            │
Research Agent ─── LLM tool calling┘
      ├── searchWeb        (Serper)
      ├── readPage         (Cheerio)
      ├── retrieveKnowledge (pgvector similarity search)
      ├── saveMemory
      └── retrieveMemory
```

See [docs/architecture.md](docs/architecture.md) for the full request flow,
the RAG pipeline, and the database schema.

## Tech Stack

**Backend:** Node.js, Express, PostgreSQL, pgvector\
**AI:** Cohere (`command-a-plus` chat + tool calling, `embed-v4.0`
embeddings), Retrieval-Augmented Generation\
**Web research:** Serper API, Cheerio\
**Background jobs:** Redis, BullMQ, ioredis\
**Frontend:** React (Vite), react-markdown\
**Auth:** JWT, bcrypt

## Project Structure

```text
ai-research-rag-agent/
├── database/
│   └── schema.sql              # Table definitions, run by npm run migrate
├── src/
│   ├── agents/
│   │   └── researchAgent.js     # Orchestrates one research request end to end
│   ├── config/                  # env, database pool, migration runner
│   ├── controllers/              # HTTP request handlers
│   ├── middleware/
│   │   └── authMiddleware.js     # Verifies JWT, attaches req.user
│   ├── queues/
│   │   └── researchQueue.js      # BullMQ queue definition
│   ├── routes/                   # Express routers
│   ├── services/                  # Business logic and DB access
│   ├── tools/                    # Functions the LLM can call
│   ├── utils/
│   │   └── chunkText.js          # Splits document text into overlapping chunks
│   ├── workers/
│   │   └── researchWorker.js     # BullMQ worker process
│   ├── app.js                    # Express app + route mounting
│   └── server.js                 # Entry point
├── frontend/                     # React + Vite single-page app
├── Dockerfile                    # Backend image (API and worker share it)
├── docker-compose.yml            # frontend, backend, worker, redis
└── docs/
    ├── architecture.md
    ├── api.md
    └── development-notes.md
```

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL with the `pgvector` extension available
- A [Serper](https://serper.dev) API key (web search)
- A [Cohere](https://cohere.com) API key (chat + embeddings)

### Environment variables

Create a `.env` file in the project root:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
SERPER_API_KEY=your_serper_api_key
COHERE_API_KEY=your_cohere_api_key
```

Never commit `.env` or API keys to Git.

### Option A — run everything with Docker Compose

```bash
docker compose up --build
```

This starts four containers on a shared network:

| Service    | What it runs                          | Port                |
|------------|----------------------------------------|----------------------|
| `frontend` | React app served by nginx              | `5173` → `80`        |
| `backend`  | Express API (`npm start`)              | `5000`               |
| `worker`   | `node src/workers/researchWorker.js`   | —                    |
| `redis`    | `redis:7`, used by BullMQ              | (internal)           |

Run the migration once against your database before (or alongside)
bringing the stack up:

```bash
npm run migrate
```

> The `backend` and `worker` containers read Redis at the hostname
> `research-redis`, matching the Compose service name. If you run either
> process **outside** Docker (see Option B), point it at a Redis instance
> reachable at that same hostname, or update the `connection.host` in
> [`src/queues/researchQueue.js`](src/queues/researchQueue.js) and
> [`src/workers/researchWorker.js`](src/workers/researchWorker.js) to
> `localhost` / your Redis host. See
> [docs/development-notes.md](docs/development-notes.md) for details.

### Option B — run the pieces individually

```bash
npm install
npm run migrate
```

Start Redis (only needed if not already running):

```bash
docker run -d --name research-redis -p 6379:6379 redis:7
```

Start the API server:

```bash
npm start
```

Start the research worker in a separate terminal:

```bash
node src/workers/researchWorker.js
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The API listens on `http://localhost:5000`, and the frontend dev server
on `http://localhost:5173`.

## API Overview

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/profile

POST /api/research
GET  /api/research
GET  /api/research/:id

POST /api/documents
GET  /api/documents
GET  /api/documents/:id

POST /api/knowledge/retrieve
POST /api/memories
GET  /api/memories

GET  /api/reports/:id

GET  /api/health
```

Every endpoint except `/api/auth/*` and `/api/health` requires a
`Authorization: Bearer <token>` header. See
[docs/api.md](docs/api.md) for full request/response examples.

## How a research request works

1. `POST /api/research` creates a `research_requests` row and enqueues a
   BullMQ job, returning `202 Accepted` immediately.
2. The research worker picks up the job and runs the research agent.
3. The agent talks to Cohere with five tools available — `searchWeb`,
   `readPage`, `retrieveKnowledge`, `saveMemory`, `retrieveMemory` — and
   decides which ones to call, and how many times (capped at 5 tool
   calls per request).
4. Once the model returns a final answer, the worker stores it as a
   `reports` row along with the sources the agent actually read.
5. The research request's status moves from `pending` → `running` →
   `completed` (or `failed` after all retries are exhausted).
6. The frontend polls `GET /api/research/:id` until the status settles.

## Documentation

- [Architecture](docs/architecture.md) — system design, request flow, RAG
  pipeline, database schema
- [API Reference](docs/api.md) — every endpoint, with example requests
  and responses
- [Development Notes](docs/development-notes.md) — implementation
  details, design decisions, and known limitations

## Project Goal

This project is built to demonstrate practical AI application
architecture end to end: agentic workflows, LLM tool calling,
Retrieval-Augmented Generation, vector search, long-term agent memory,
background job processing, authentication, and persistent data storage —
in a codebase small enough to read in full.