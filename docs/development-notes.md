# Development Notes

This document contains implementation details that are useful while
developing and explaining the project.

## Backend Structure

``` text
src/
├── agents/
├── config/
├── controllers/
├── middleware/
├── queues/
├── routes/
├── services/
├── tools/
├── utils/
└── workers/
```

The project separates HTTP controllers, business logic, AI tools, queue
processing, and database access.

## Database

The database schema is maintained in:

``` text
database/schema.sql
```

Migrations are executed with:

``` bash
npm run migrate
```

The migration runner reads the SQL file instead of keeping table
definitions inside JavaScript.

## Authentication

Passwords are hashed with bcrypt.

After successful login, the server creates a JWT containing the
authenticated user's ID and email.

Protected routes use `authMiddleware` to verify the token and attach the
decoded user information to:

``` js
req.user
```

## Agent Tool Calling

The LLM can decide when to use available tools.

Current tools include:

``` text
searchWeb
readPage
retrieveKnowledge
```

The tool results are returned to the LLM, which can use them to continue
the research process.

The agent can use web research, private knowledge retrieval, or both
depending on the question.

## RAG Implementation

Documents are divided into chunks before embedding.

Document embeddings use:

``` text
Cohere embed-v4.0
1024 dimensions
```

Query embeddings use the query-specific embedding input type.

Similarity is calculated with pgvector's cosine distance operator:

``` sql
<=> 
```

Smaller distance means greater similarity.

## Background Processing

BullMQ uses Redis to manage research jobs.

The API and worker are separate processes:

``` text
API Server
   │
   └── adds job
          ↓
        Redis
          ↓
    Research Worker
          ↓
    Research Agent
```

Jobs are configured with:

-   3 attempts
-   Exponential backoff
-   Removal of completed jobs
-   Removal of failed jobs

Permanent research data is stored in PostgreSQL, not Redis.

## Error Handling

The project handles failures at several levels.

### API Queue Failure

If the database request is created but the BullMQ job cannot be added,
the request is marked as `failed`.

### Worker Failure

If the research agent throws an error, the worker rethrows it so BullMQ
can retry the job.

The database request is marked as `failed` only when the final attempt
fails.

### Agent Failure

Errors from the LLM, search, page reading, report creation, or source
persistence propagate to the worker.

## Important Design Decisions

### Why 202 Accepted?

Research can take longer than a normal API request.

The API accepts the request and queues the work instead of waiting for
the entire research process to finish.

### Why store sources separately?

Research sources belong to a specific research request and can be
displayed alongside the generated report.

### Why keep document content and chunks?

The original document is preserved in `documents`, while chunks are
stored separately for vector retrieval.

### Why filter RAG by user ID?

Documents are private user data. Authentication alone is not enough. The
database query must also enforce ownership.

## Current Limitations

The current version is intentionally focused and explainable.

Planned production improvements include:

-   More comprehensive automated tests
-   Dockerizing the complete application
-   Production deployment
-   More robust observability
-   Frontend integration
-   Additional queue and infrastructure tuning

The project avoids unnecessary complexity until a feature has a clear
purpose.
