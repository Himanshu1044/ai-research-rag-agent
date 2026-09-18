# Architecture

## High-Level Architecture

```text
User
 │
 ▼
React Frontend (Vite, served by nginx in Docker)
 │
 ▼
Express API
 │
 ├── Auth              (register / login / profile)
 ├── Research API       (create / list / detail)
 ├── Document API       (upload / list / detail)
 ├── Knowledge API      (ad-hoc RAG retrieval)
 ├── Memory API         (save / list)
 └── Report API         (fetch a report by id)
 │
 ├──────────────────────────────┐
 ▼                              ▼
PostgreSQL (+ pgvector)     Redis + BullMQ
 │                              │
 │                              ▼
 │                        Research Worker
 │                              │
 │                              ▼
 │                        Research Agent
 │                              │
 │            ┌─────────────────┼─────────────────┬───────────────┐
 │            ▼                 ▼                 ▼               ▼
 │        searchWeb          readPage      retrieveKnowledge   saveMemory /
 │        (Serper)          (Cheerio)       (pgvector)        retrieveMemory
 │            │                 │                 │               │
 │            └─────────────────┴────────┬────────┴───────────────┘
 │                                        ▼
 │                                     Cohere chat
 │                                  (tool-calling loop)
 └────────────────────────────────────────┘
```

The frontend never talks to Redis, BullMQ, or Cohere directly — it only
calls the Express API and polls for status.

## Research Request Flow

A research request is intentionally asynchronous, because a single
request can involve several web searches, page reads, retrieval
queries, and multiple round trips to the LLM.

```text
POST /api/research
       ↓
Create research_requests row (status = pending)
       ↓
Add BullMQ job { researchRequestId }
       ↓
Return 202 Accepted
       ↓
Research Worker picks up the job
       ↓
status = running
       ↓
Research Agent runs the tool-calling loop
       ↓
Create reports row + research_sources rows
       ↓
status = completed
```

If the database row is created but the job cannot be enqueued (Redis is
down, for example), the request is immediately marked `failed` and the
API still returns a clear error rather than leaving an orphaned
`pending` row.

If the worker throws while processing a job, BullMQ retries it up to
three times with exponential backoff (starting at 2s). The request row
is only marked `failed` once the final attempt has been exhausted —
earlier retries leave the status as `running`.

## The Research Agent's Tool-Calling Loop

The agent (`src/services/llmService.js`) runs a loop against Cohere's
`command-a-plus` model with five tools registered:

| Tool | Purpose | Backed by |
|---|---|---|
| `searchWeb` | Search the web for a query | Serper API |
| `readPage` | Fetch a URL and extract its visible text | `fetch` + Cheerio |
| `retrieveKnowledge` | Search the user's private documents | pgvector similarity search |
| `saveMemory` | Persist a fact about the user for later | `memories` table |
| `retrieveMemory` | Recall previously saved facts about the user | `memories` table |

On each iteration:

1. The current message history and tool definitions are sent to Cohere.
2. If the model responds with a tool call, the corresponding function
   in `toolFunctions` runs, and the result is appended to the message
   history as a `tool` message.
3. If the model responds with plain text instead of a tool call, that
   text becomes the final answer and the loop ends.
4. The loop is capped at **5 tool calls**. If the cap is reached without
   a final answer, one last request is sent instructing the model to
   answer using only what it has already gathered, with no further
   tool access.

Sources are collected from every `readPage` call, and retrieved
knowledge chunks are collected from every `retrieveKnowledge` call, so
both can be returned to the caller and persisted alongside the report.

A tool call that throws (a failed fetch, a bad URL, a Serper error) does
not crash the loop — the error is caught and fed back to the model as a
tool result, so the agent can decide to try something else or proceed
with what it has.

## RAG Flow (Document Ingestion)

```text
POST /api/documents { title, source, content }
       ↓
Store document (status = processing)
       ↓
chunkText(content) → overlapping ~500-word chunks (50-word overlap)
       ↓
Insert document_chunks (one transaction)
       ↓
For each chunk: Cohere embed-v4.0 (input_type = search_document, 1024 dims)
       ↓
Store the embedding on the chunk
       ↓
Mark document as completed (or failed, if any step throws)
```

## RAG Flow (Retrieval, During Research)

```text
Query text (from the agent's retrieveKnowledge tool call,
            or a direct POST /api/knowledge/retrieve call)
       ↓
Cohere embed-v4.0 (input_type = search_query, 1024 dims)
       ↓
pgvector cosine-distance search over document_chunks
       ↓
WHERE documents.user_id = <authenticated user>
       ↓
ORDER BY embedding <=> query_embedding LIMIT <limit, default 5>
       ↓
Relevant chunks returned to the agent / caller
```

Retrieval is always filtered by `user_id` via a join to `documents`, so
one user's uploaded material can never be surfaced in another user's
research or knowledge queries.

## Long-Term Memory

Memory is deliberately simple: `memories` is a flat, append-only table
per user with no embeddings or ranking. The agent decides when a fact is
worth saving (`saveMemory`) and when past memories might be relevant
(`retrieveMemory`, which returns everything for that user, newest
first). This keeps the memory feature easy to reason about; if the
number of memories per user grows large, this is the first place to add
retrieval by relevance rather than returning the full list.

## Main Database Relationships

```text
users
 │
 ├── research_requests
 │       ├── research_sources
 │       └── reports
 │
 ├── documents
 │       └── document_chunks (embedding VECTOR(1024))
 │
 └── memories
```

Every row that stores user data carries a `user_id` (directly, or via a
join to `research_requests` / `documents`), and every service query
filters on it. See [`database/schema.sql`](../database/schema.sql) for
exact column definitions and cascade rules — all child tables use
`ON DELETE CASCADE` from `users`, so deleting a user removes their
research, documents, chunks, and memories.

## Why Redis and BullMQ?

Research work shouldn't happen inside the lifetime of an HTTP request:
an agent run can make several LLM calls and several outbound HTTP
requests, and a client shouldn't have to keep a connection open for that
long, and the API shouldn't either.

The API creates a database row and a queue job, then returns `202
Accepted`. A separate worker process consumes the job and performs the
work. This gives the application:

- Asynchronous processing, decoupled from the request/response cycle
- Automatic retry with backoff on transient failures
- A clean separation between the stateless API and the worker
- Room to run multiple worker instances if throughput becomes a concern

## Why PostgreSQL + pgvector?

PostgreSQL stores all of the application's relational data (users,
research requests, reports, sources, documents, memories), and pgvector
lets embeddings live in the same database as everything else, queried
with ordinary SQL (`ORDER BY embedding <=> $1`). This avoids running a
separate vector database for a project of this size, while still
supporting real similarity search.

## Main Components

### Express API (`src/app.js`, `src/routes/*`, `src/controllers/*`)

Handles HTTP requests, JWT authentication, request validation, and
shaping responses. Controllers are thin — they validate input and defer
to services for anything that touches the database or an external API.

### Research Agent (`src/agents/researchAgent.js`)

Loads a research request, marks it `running`, calls into the LLM
service to actually do the research, persists the resulting report and
sources, and marks the request `completed`.

### LLM Service (`src/services/llmService.js`)

Owns the Cohere client, the tool definitions, and the tool-calling loop
described above.

### Tools (`src/tools/*.js`)

Plain functions the LLM service can invoke: `searchWeb`, `readPage`,
`saveMemory`, `retrieveMemory`. (`retrieveKnowledge` is implemented
directly in `retrievalService.js` and reused by both the agent and the
`/api/knowledge/retrieve` endpoint.)

### Research Worker (`src/workers/researchWorker.js`)

A standalone process that consumes jobs from the `research` BullMQ
queue and runs the research agent for each one. Runs independently of
the API server and can be scaled or restarted separately.

### PostgreSQL

Stores `users`, `research_requests`, `research_sources`, `reports`,
`documents`, `document_chunks` (with `pgvector` embeddings), and
`memories`.