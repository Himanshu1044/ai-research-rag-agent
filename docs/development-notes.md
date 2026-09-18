# Development Notes

Implementation details and design decisions that are useful while
developing, debugging, or explaining the project.

## Backend Structure

```text
src/
├── agents/         # Orchestrates a single research request end to end
├── config/         # env loading, database pool, migration runner
├── controllers/    # HTTP request handlers (thin — validate + delegate)
├── middleware/      # authMiddleware (JWT verification)
├── queues/          # BullMQ queue definition
├── routes/          # Express routers, one per resource
├── services/        # Business logic and database access
├── tools/            # Functions exposed to the LLM as tools
├── utils/            # Small pure helpers (e.g. chunkText)
└── workers/           # Standalone BullMQ worker process
```

The project separates HTTP handling, business logic, AI tools, queue
processing, and database access into distinct layers. Controllers call
services; services own SQL and external API calls; tools wrap services
in the shape the LLM's tool-calling API expects.

## Database

The schema is maintained as plain SQL in:

```text
database/schema.sql
```

Migrations run with:

```bash
npm run migrate
```

`src/config/migrate.js` reads `schema.sql` and executes it directly
against `DATABASE_URL` rather than keeping table definitions scattered
across JavaScript files or using a migration framework. All `CREATE
TABLE` statements use `IF NOT EXISTS`, so running the migration again is
safe.

Tables: `users`, `research_requests`, `research_sources`, `reports`,
`documents`, `document_chunks`, `memories`. Every table that stores
per-user data references `users(id)` with `ON DELETE CASCADE`, either
directly or through `research_requests` / `documents`.

## Authentication

- Passwords are hashed with `bcrypt` (10 salt rounds) before storage —
  the raw password is never persisted.
- On successful login, the server signs a JWT containing `userId` and
  `email`, expiring after 7 days (`JWT_SECRET` from the environment).
- `authMiddleware` reads the `Authorization: Bearer <token>` header,
  verifies the JWT, and attaches the decoded payload to `req.user` for
  downstream handlers. Missing/malformed headers and invalid/expired
  tokens both return `401`.

## Agent Tool Calling

The agent's tools are defined once in `src/services/llmService.js` (both
the JSON schema sent to Cohere and the local `toolFunctions` map used to
actually execute them):

```text
searchWeb
readPage
retrieveKnowledge
saveMemory
retrieveMemory
```

Three of these tools (`retrieveKnowledge`, `saveMemory`,
`retrieveMemory`) need the authenticated user's ID to enforce data
isolation, so the loop passes `userId` into them explicitly; `searchWeb`
and `readPage` don't touch per-user data and are called without it.

The loop is capped at `maxToolCalls = 5`. This bounds both cost and
latency per research request — if the model hasn't produced a final
answer within 5 tool calls, the loop stops issuing new tool calls and
asks the model for a best-effort answer using only what's already been
gathered.

A tool error (a bad URL passed to `readPage`, a Serper failure, etc.) is
caught and turned into `{ error: true, message }`, which is fed back to
the model as a normal tool result rather than crashing the whole
research run. This lets the agent try a different approach instead of
failing the entire request over one bad tool call.

## RAG Implementation

- Documents are split into chunks with `chunkText` — 500 words per
  chunk with a 50-word overlap between consecutive chunks, so context
  isn't lost at chunk boundaries.
- Chunks are inserted in a single transaction (`documentChunkService`)
  before embeddings are generated, so partial chunk sets are never left
  behind if something fails mid-way.
- Document embeddings use Cohere `embed-v4.0` with `input_type:
  "search_document"`; query embeddings use the same model with
  `input_type: "search_query"` — both at 1024 dimensions, matching the
  `VECTOR(1024)` column in `document_chunks`.
- Similarity is computed with pgvector's cosine-distance operator
  (`<=>`); smaller distance means greater similarity. Results are
  ordered by distance and capped by `limit` (default 5).
- Retrieval is always joined against `documents` and filtered by
  `user_id`, both when the agent calls `retrieveKnowledge` and when a
  client calls `POST /api/knowledge/retrieve` directly.

## Memory Implementation

Memory is a flat, append-only `memories` table per user — no embeddings,
no ranking, no expiry. `saveMemory` inserts a row; `retrieveMemory`
returns every memory for that user, newest first. The agent's system
prompt tells it when to use each ("save useful information... use
retrieveMemory when previous information about the user may help"), but
there's no automatic pruning or deduplication — if this becomes a
problem in practice, that's the place to add relevance filtering rather
than returning the full list.

## Background Processing

BullMQ (backed by Redis) decouples the API from the actual research
work:

```text
API Server
   │
   └── researchQueue.add("research", { researchRequestId })
          ↓
        Redis
          ↓
    Research Worker (separate process)
          ↓
    Research Agent
```

Job options (`src/queues/researchQueue.js`):

- `attempts: 3`
- Exponential backoff starting at 2000ms
- `removeOnComplete: true` / `removeOnFail: true` — Redis only holds
  jobs transiently; all durable state lives in PostgreSQL.

**Note on the Redis hostname:** both `researchQueue.js` and
`researchWorker.js` hardcode `connection.host: "research-redis"`, which
is the Docker Compose service name for Redis. This works out of the box
when the API, worker, and Redis all run inside the Compose network. If
you run the API or worker as plain `node` processes outside Docker
(Option B in the README), `research-redis` will not resolve unless you
either add a hosts-file entry pointing it at your Redis container, or
change `connection.host` to `localhost` (or wherever Redis is actually
reachable) in both files. This isn't read from an environment variable
today — that would be a reasonable follow-up if the app needs to run
in more than one topology.

## Error Handling

The project handles failures at three levels:

### API / enqueue failure

If the `research_requests` row is created but the BullMQ job can't be
added (Redis unreachable, for example), the controller marks the
request `failed` immediately rather than leaving it stuck at `pending`
with no job ever tracking it.

### Worker / job failure

If `runResearchAgent` throws, the worker re-throws so BullMQ can retry
according to the queue's `attempts`/`backoff` config. The worker only
marks the request `failed` in the database once `job.attemptsMade + 1
>= job.opts.attempts` — i.e., on the last attempt — so a request that
will still be retried keeps showing `running` rather than flickering to
`failed` and back.

### Agent / tool failure

Errors from Cohere, `searchWeb`, or `readPage` are either caught inside
the tool-calling loop (turned into a tool-visible error, letting the
agent adapt) or propagate up to the worker (which triggers the retry
path above) if they happen outside the loop — e.g. in report or source
persistence.

### Document ingestion failure

If chunking or embedding fails while processing an upload, the document
row's status is set to `failed` in the `catch` block of
`postDocument`, so a partially-processed document is visibly marked
rather than silently left at `processing` forever.

## Important Design Decisions

### Why `202 Accepted` for research?

Research can involve multiple LLM calls and multiple outbound HTTP
requests to search and read pages — often several seconds to a minute
or more. The API accepts the request, persists it, queues the work, and
returns immediately rather than holding the HTTP connection open for
the whole run.

### Why store sources separately from the report?

`research_sources` rows belong to a specific `research_request` and are
displayed alongside its report, with an explicit `source_index` so the
frontend can show them in the order the agent actually consulted them —
rather than parsing citations back out of the report text.

### Why keep both document content and document chunks?

The full original text is preserved in `documents.content` (so nothing
is lost and documents can be re-chunked later if the chunking strategy
changes), while `document_chunks` exists purely to support vector
retrieval at a smaller granularity than a whole document.

### Why filter every RAG and memory query by `user_id`?

Documents and memories are private user data. JWT authentication proves
*who* is asking, but it doesn't automatically scope *what* they can see
— every service query that reads `documents`, `document_chunks`,
`memories`, `research_requests`, or `reports` explicitly filters (or
joins) on `user_id`, so a bug in one layer doesn't silently leak data
across accounts.

### Why does the agent have separate `saveMemory`/`retrieveMemory` tools instead of always injecting memory into the prompt?

Letting the model decide when memory is relevant keeps the system
prompt short for questions where past context isn't useful, and avoids
growing the prompt unbounded as a user accumulates more memories over
time.

## Current Limitations

The project is intentionally focused rather than "production-hardened."
Known gaps, in rough order of priority:

- The Redis hostname is hardcoded to the Docker Compose service name
  (see above) instead of coming from an environment variable.
- No automated test suite yet.
- No pagination on list endpoints (`GET /api/research`, `GET
  /api/documents`, `GET /api/memories`) — fine at small scale, but will
  need it as data grows.
- Memory retrieval returns everything for a user rather than ranking by
  relevance to the current question.
- No rate limiting on research creation or document uploads, both of
  which call paid external APIs (Cohere, Serper).
- No structured logging or observability beyond `console.log` /
  `console.error`.
- The frontend talks to a hardcoded `http://localhost:5000` base URL
  rather than an environment-configurable API URL, which will need to
  change for a non-local deployment.

The project avoids adding complexity (auth scopes, multi-tenant
namespacing, a dedicated vector database, a task queue beyond BullMQ)
until a concrete requirement calls for it.