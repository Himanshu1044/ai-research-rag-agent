# API Reference

Base URL during local development:

```text
http://localhost:5000
```

All request and response bodies are JSON. All endpoints below except
`/api/auth/register`, `/api/auth/login`, and `/api/health` require an
`Authorization` header:

```http
Authorization: Bearer <token>
```

Requests missing or with an invalid/expired token receive:

```json
{ "error": "Unauthorized" }
```

or

```json
{ "error": "Invalid or Expired Token" }
```

both with HTTP status `401`.

---

## Authentication

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- `email` and `password` are required.
- `password` must be at least 8 characters.

Responses:

| Status | Meaning |
|---|---|
| `201` | User created |
| `400` | Missing fields, or password shorter than 8 characters |
| `409` | A user with that email already exists |

```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response (`200`) contains a JWT valid for 7 days:

```json
{
  "message": "Login successful",
  "token": "..."
}
```

Invalid credentials return `401`:

```json
{ "error": "Invalid Credentials" }
```

Use the token for every protected endpoint below:

```http
Authorization: Bearer <token>
```

### Get profile

```http
GET /api/profile
Authorization: Bearer <token>
```

Response (`200`):

```json
{
  "profile": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## Research

### Create a research request

```http
POST /api/research
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "question": "How is AI changing software development?"
}
```

`question` is required and non-empty. The endpoint returns `202
Accepted` immediately — the research itself runs in the background.

```json
{
  "message": "Research request queued successfully",
  "researchRequest": {
    "id": 42,
    "user_id": 1,
    "question": "How is AI changing software development?",
    "status": "pending",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

If the job cannot be queued (e.g. Redis is unavailable), the request
row is marked `failed` and the endpoint returns `500`:

```json
{ "error": "Failed to queue research request" }
```

### List research history

```http
GET /api/research
Authorization: Bearer <token>
```

Returns the authenticated user's own research requests, newest first.

```json
{
  "message": "Research History",
  "researchHistory": [
    {
      "id": 42,
      "question": "How is AI changing software development?",
      "status": "completed",
      "created_at": "2026-01-01T00:00:00.000Z",
      "completed_at": "2026-01-01T00:02:14.000Z"
    }
  ]
}
```

### Get research details

```http
GET /api/research/:id
Authorization: Bearer <token>
```

Returns the research request, its generated report (if any), and the
sources the agent consulted. A request belonging to another user
returns `404`, not another user's data.

```json
{
  "researchRequest": {
    "id": 42,
    "question": "How is AI changing software development?",
    "status": "completed",
    "created_at": "2026-01-01T00:00:00.000Z",
    "completed_at": "2026-01-01T00:02:14.000Z"
  },
  "report": {
    "id": 7,
    "content": "...",
    "created_at": "2026-01-01T00:02:10.000Z",
    "updated_at": "2026-01-01T00:02:10.000Z"
  },
  "sources": [
    {
      "id": 1,
      "title": "Example Source",
      "url": "https://example.com/article",
      "source_index": 1,
      "retrieved_at": "2026-01-01T00:01:40.000Z"
    }
  ]
}
```

`report` is `null` if the request hasn't completed yet.

---

## Documents (Knowledge Base)

### Upload a document

```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "title": "AI Software Development Notes",
  "source": "personal-notes",
  "content": "Document content..."
}
```

`title` and `content` are required; `source` is optional (a free-text
label like `"personal-notes"` or a URL). The backend stores the
document, splits it into overlapping chunks, generates an embedding for
each chunk via Cohere, and stores the vectors — all before responding.

```json
{
  "message": "Document created successfully",
  "document": {
    "id": 3,
    "title": "AI Software Development Notes",
    "source": "personal-notes",
    "status": "completed",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:05.000Z"
  },
  "chunksCreated": 4
}
```

If chunking or embedding fails partway through, the document's status
is set to `failed` rather than left as `processing`.

### List documents

```http
GET /api/documents
Authorization: Bearer <token>
```

Returns the authenticated user's documents (metadata only — no
`content`), newest first.

```json
{
  "message": "Documents retrieved successfully",
  "documents": [
    {
      "id": 3,
      "title": "AI Software Development Notes",
      "source": "personal-notes",
      "status": "completed",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get a single document

```http
GET /api/documents/:id
Authorization: Bearer <token>
```

Returns the full document, including `content`, if it belongs to the
authenticated user. Returns `404` otherwise.

```json
{
  "document": {
    "id": 3,
    "title": "AI Software Development Notes",
    "source": "personal-notes",
    "content": "Document content...",
    "status": "completed",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:05.000Z"
  }
}
```

---

## Knowledge Retrieval

### Query the knowledge base directly

```http
POST /api/knowledge/retrieve
Authorization: Bearer <token>
Content-Type: application/json
```

Runs the same pgvector similarity search the research agent uses,
without going through a full research request — useful for testing
retrieval quality or building a "search my notes" feature.

Request:

```json
{
  "query": "What did I write about vector databases?",
  "limit": 5
}
```

`query` is required. `limit` is optional (defaults to `5`).

```json
{
  "message": "Knowledge retrieved successfully",
  "knowledge": [
    {
      "id": 12,
      "document_id": 3,
      "chunk_index": 1,
      "content": "...",
      "title": "AI Software Development Notes",
      "source": "personal-notes",
      "distance": 0.184
    }
  ]
}
```

`distance` is cosine distance — smaller means more similar. Results are
always restricted to the authenticated user's own documents.

---

## Memories

The research agent can save and recall facts about a user across
sessions using these same tables; these endpoints expose that data
directly.

### Save a memory

```http
POST /api/memories
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{ "content": "Prefers concise, bullet-point summaries." }
```

```json
{
  "message": "Memory saved successfully",
  "memory": {
    "id": 5,
    "user_id": 1,
    "content": "Prefers concise, bullet-point summaries.",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

### List memories

```http
GET /api/memories
Authorization: Bearer <token>
```

```json
{
  "message": "Memories retrieved successfully",
  "memories": [
    {
      "id": 5,
      "content": "Prefers concise, bullet-point summaries.",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Reports

### Get a report by id

```http
GET /api/reports/:id
Authorization: Bearer <token>
```

Fetches a single report directly (as opposed to via
`GET /api/research/:id`, which returns the report alongside the request
and its sources). Ownership is enforced by joining through
`research_requests.user_id`; a report belonging to another user's
research returns `404`.

```json
{
  "report": {
    "id": 7,
    "content": "...",
    "created_at": "2026-01-01T00:02:10.000Z",
    "updated_at": "2026-01-01T00:02:10.000Z"
  }
}
```

---

## Health

```http
GET /api/health
```

No authentication required. Used to verify the API server is running.

```json
{
  "status": "OK",
  "message": "AI Research & RAG Agent API is running"
}
```

---

## Research Status Lifecycle

Research requests move through:

```text
pending → running → completed
                  ↘ failed
```

Typical client flow:

1. `POST /api/research` → get back an `id` with status `pending`.
2. Poll `GET /api/research/:id` on an interval until `status` is
   `completed` or `failed`.
3. On `completed`, the response includes `report` and `sources`.

## Security Notes

- All protected routes require a valid JWT (`authMiddleware`).
- Research details are filtered by both `research_request_id` and the
  authenticated `user_id` — a valid token for one user cannot retrieve
  another user's research, documents, memories, or reports.
- RAG retrieval (`retrieveKnowledge` / `POST /api/knowledge/retrieve`)
  is filtered by `user_id` via a join to `documents`, so private
  knowledge never crosses between users.