# Architecture

## High-Level Architecture

``` text
User
 │
 ▼
React Frontend
 │
 ▼
Express API
 │
 ├── Auth
 ├── Research API
 └── Document API
 │
 ├──────────────────────┐
 ▼                      ▼
PostgreSQL          Redis + BullMQ
 │                      │
 │                      ▼
 │                Research Worker
 │                      │
 │                      ▼
 │                Research Agent
 │                      │
 │          ┌───────────┼───────────┐
 │          ▼           ▼           ▼
 │       Serper      readPage      RAG
 │          │                       │
 │          └───────────┬───────────┘
 │                      ▼
 │                     LLM
 │                      │
 └──────────────────────┘
```

## Research Request Flow

A research request is intentionally asynchronous because research can
involve multiple network calls and LLM operations.

``` text
POST /api/research
       ↓
Create research_requests row
       ↓
Add BullMQ job
       ↓
Return 202 Accepted
       ↓
Research Worker
       ↓
status = running
       ↓
Research Agent
       ↓
Search / Read / RAG / LLM
       ↓
Create report + sources
       ↓
status = completed
```

If the queue cannot accept the job, the request is marked `failed`.

If the worker fails while processing, BullMQ retries the job up to three
times with exponential backoff. The request is marked `failed` only
after the final failed attempt.

## RAG Flow

``` text
User Document
     ↓
Store document
     ↓
Split into chunks
     ↓
Cohere document embedding
     ↓
Store vector in pgvector
```

During research:

``` text
Research Question
     ↓
Cohere query embedding
     ↓
pgvector similarity search
     ↓
Relevant chunks
     ↓
LLM
```

Retrieval is filtered by `user_id`, preventing one user's documents from
being returned to another user.

## Main Database Relationships

``` text
users
 │
 ├── research_requests
 │       ├── research_sources
 │       └── reports
 │
 ├── documents
 │       └── document_chunks
 │
 └── memories
```

## Why Redis and BullMQ?

Research should not depend on keeping an HTTP request open while the AI
agent works.

The API creates a job and returns `202 Accepted`. A separate worker
consumes the job and performs the long-running work.

This gives the application:

-   Asynchronous processing
-   Retry handling
-   Separation between API and worker processes
-   Better handling of concurrent research requests

## Why PostgreSQL + pgvector?

PostgreSQL stores normal application data while pgvector allows vector
embeddings to be stored and searched in the same database.

This keeps the architecture relatively simple while supporting RAG.

## Main Components

### Express API

Handles HTTP requests, authentication, validation, and API responses.

### Research Agent

Coordinates the research workflow and calls the LLM service.

### LLM Service

Handles Cohere communication and tool calling.

### Research Tools

-   `searchWeb`
-   `readPage`
-   `retrieveKnowledge`

### Research Worker

Consumes BullMQ jobs and runs the research agent.

### PostgreSQL

Stores users, research requests, documents, document chunks, reports,
sources, and memories.
