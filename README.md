# AI Research & RAG Agent

An AI-powered research assistant that performs web research, retrieves
relevant information from a user's private knowledge base, and generates
structured research reports.

## What it does

-    User authentication with JWT
-    Web search and web-page extraction
-    LLM tool calling and agentic research
-    RAG over user-uploaded documents
-    Vector similarity search with pgvector
-    Asynchronous research jobs with Redis + BullMQ
-    Persistent reports and research sources
-    User-level data isolation

## Architecture

``` text
React
  ↓
Express API
  ↓
PostgreSQL
  │
  ├── Research Requests
  ├── Reports
  ├── Sources
  └── User Documents → pgvector
  │
  └── Redis + BullMQ
          ↓
     Research Worker
          ↓
     Research Agent
       ├── Web Search
       ├── Read Pages
       ├── RAG Retrieval
       └── LLM
```

## Tech Stack

**Backend:** Node.js, Express, PostgreSQL, pgvector\
**AI:** Cohere, LLM tool calling, RAG\
**Research:** Serper API, Cheerio\
**Jobs:** Redis, BullMQ, ioredis\
**Frontend:** React, Tailwind CSS

## Current Status

### Completed

-   Backend foundation and database
-   Authentication and protected APIs
-   Research workflow and report generation
-   Web research tools
-   RAG document ingestion and retrieval
-   Redis + BullMQ background processing
-   Retry and failure handling
-   User data isolation

### In Progress

-   React frontend
-   Frontend/backend integration
-   Research status polling

### Planned

-   Dockerize the full application
-   Automated testing
-   Deployment
-   Final documentation

## Quick Start

``` bash
npm install
npm run migrate
npm start
```

Run Redis with Docker:

``` bash
docker run -d --name research-redis -p 6379:6379 redis:7
```

Run the research worker in a separate terminal:

``` bash
node src/workers/researchWorker.js
```

Create a `.env` file:

``` env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
SERPER_API_KEY=your_serper_api_key
COHERE_API_KEY=your_cohere_api_key
```


## API Overview

``` text
POST /api/auth/register
POST /api/auth/login

POST /api/research
GET  /api/research
GET  /api/research/:id

POST /api/documents
GET  /api/documents

GET /api/health
```

Research and document endpoints require JWT authentication.

## Documentation

-   [Architecture](docs/architecture.md)
-   [API Reference](docs/api.md)
-   [Development Notes](docs/development-notes.md)

## Project Goal

The project is built to demonstrate practical AI application
architecture: agentic workflows, tool calling, RAG, vector search,
background jobs, authentication, and persistent data storage.
