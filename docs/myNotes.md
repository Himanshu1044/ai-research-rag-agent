# AI Research & RAG Agent

An AI-powered research assistant that performs multi-step web research, retrieves relevant information from a user's private knowledge base, and generates structured research reports.

The project combines **LLM tool calling, web research, Retrieval-Augmented Generation (RAG), PostgreSQL with pgvector, Redis, and BullMQ** into an asynchronous research workflow.

## Project Overview

The goal of this project is to build a production-style AI research system that can:

* Accept research questions from authenticated users
* Perform web searches when external information is required
* Read and extract content from web pages
* Search the user's private knowledge base using vector similarity
* Decide when web research or private knowledge retrieval is useful
* Generate a research report using an LLM
* Store research reports and sources
* Process research requests asynchronously using Redis and BullMQ
* Keep user data isolated from other users

## Architecture

```text
User
 │
 ▼
React Frontend
 │
 ▼
Express API
 │
 ├── Authentication
 │
 ├── Research API
 │
 └── Document API
 │
 ▼
PostgreSQL
 │
 ├── Users
 ├── Research Requests
 ├── Reports
 ├── Research Sources
 ├── Documents
 └── Document Chunks
       │
       └── pgvector embeddings
       
Research Request
 │
 ▼
Redis + BullMQ
 │
 ▼
Research Worker
 │
 ▼
Research Agent
 │
 ├── Search Web
 │
 ├── Read Web Pages
 │
 ├── Retrieve Private Knowledge
 │
 └── Generate Report
 │
 ▼
PostgreSQL
```

## Research Workflow

```text
Research Question
       │
       ▼
Create Research Request
       │
       ▼
Add Job to BullMQ
       │
       ▼
Research Worker
       │
       ▼
Research Agent
       │
       ├───────────────┐
       ▼               ▼
  Web Search       RAG Retrieval
       │               │
       ▼               ▼
  Read Pages      Relevant Chunks
       │               │
       └───────┬───────┘
               ▼
              LLM
               │
               ▼
          Research Report
               │
               ▼
          PostgreSQL
```

## RAG Workflow

User documents are processed and stored as vector embeddings.

```text
Document
   │
   ▼
Chunking
   │
   ▼
Cohere Embeddings
   │
   ▼
pgvector
   │
   ▼
User Research Question
   │
   ▼
Query Embedding
   │
   ▼
Vector Similarity Search
   │
   ▼
Relevant Document Chunks
   │
   ▼
LLM
```

The system uses **Cohere Embed v4** with 1024-dimensional embeddings and PostgreSQL's `pgvector` extension for similarity search.

Each retrieval query is filtered by the authenticated user's ID so that private knowledge remains isolated between users.

## Tech Stack

### Backend

* Node.js
* Express.js
* PostgreSQL
* pgvector
* JWT
* bcrypt

### AI

* Cohere
* LLM tool calling
* Retrieval-Augmented Generation (RAG)

### Web Research

* Serper API
* Cheerio
* Fetch API

### Asynchronous Processing

* Redis
* BullMQ
* ioredis

### Frontend

* React
* Tailwind CSS

> Frontend integration is currently in progress.

## Features

### Authentication

* User registration
* Password hashing with bcrypt
* User login
* JWT authentication
* Protected API routes

### Research

* Create research requests
* View research history
* View individual research results
* Asynchronous research processing
* Research status tracking

Research requests use the following statuses:

```text
pending
running
completed
failed
```

### Web Research

The research agent can:

* Search the web using Serper
* Read web pages
* Extract useful page content
* Use external information when required by the research question

### RAG

Users can upload documents to their private knowledge base.

The system:

1. Stores the document
2. Splits it into chunks
3. Generates embeddings
4. Stores embeddings in pgvector
5. Retrieves relevant chunks for research questions

### Reports and Sources

Completed research requests store:

* Generated research report
* Research sources
* Source title
* Source URL
* Source order

### Background Jobs

Research processing is handled asynchronously using BullMQ and Redis.

```text
API
 │
 ▼
BullMQ
 │
 ▼
Redis
 │
 ▼
Research Worker
 │
 ▼
Research Agent
```

Failed jobs are automatically retried up to three times using exponential backoff.

Completed and failed BullMQ jobs are removed from Redis after processing, while permanent research data remains in PostgreSQL.

## Project Structure

```text
ai-research-rag-agent/
│
├── database/
│   └── schema.sql
│
├── src/
│   ├── agents/
│   │   └── researchAgent.js
│   │
│   ├── config/
│   │   ├── database.js
│   │   ├── env.js
│   │   └── migrate.js
│   │
│   ├── controllers/
│   │   ├── documentController.js
│   │   ├── researchController.js
│   │   └── userController.js
│   │
│   ├── middleware/
│   │   └── authMiddleware.js
│   │
│   ├── queues/
│   │   └── researchQueue.js
│   │
│   ├── routes/
│   │   ├── documentRoutes.js
│   │   ├── healthRoutes.js
│   │   ├── researchRoutes.js
│   │   └── userRoutes.js
│   │
│   ├── services/
│   │   ├── databaseService.js
│   │   ├── documentChunkService.js
│   │   ├── documentService.js
│   │   ├── embeddingService.js
│   │   ├── llmService.js
│   │   ├── reportService.js
│   │   ├── researchService.js
│   │   ├── researchSourceService.js
│   │   └── retrievalService.js
│   │
│   ├── tools/
│   │   ├── readPage.js
│   │   └── searchWeb.js
│   │
│   ├── utils/
│   │   └── chunkText.js
│   │
│   ├── workers/
│   │   └── researchWorker.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Database

The application currently uses PostgreSQL with the following tables:

```text
users
research_requests
research_sources
documents
document_chunks
memories
reports
```

The main relationships are:

```text
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

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000

DATABASE_URL=your_postgresql_connection_string

JWT_SECRET=your_jwt_secret

SERPER_API_KEY=your_serper_api_key

COHERE_API_KEY=your_cohere_api_key
```

Never commit `.env` or API keys to Git.

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

Run the database migration:

```bash
npm run migrate
```

Start the API server:

```bash
npm start
```

The API will run on:

```text
http://localhost:5000
```

## Redis

The project uses Redis for BullMQ job processing.

Redis can be started locally using Docker:

```bash
docker run -d --name research-redis -p 6379:6379 redis:7
```

Verify Redis:

```bash
docker exec research-redis redis-cli ping
```

Expected output:

```text
PONG
```

## Research Worker

The research worker processes jobs from the BullMQ queue.

Run the worker with:

```bash
node src/workers/researchWorker.js
```

The API server and research worker run as separate processes.

## API Endpoints

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
```

### Research

```text
POST /api/research
GET  /api/research
GET  /api/research/:id
```

Research endpoints require JWT authentication.

### Documents

```text
POST /api/documents
GET  /api/documents
```

Document endpoints require JWT authentication.

### Health

```text
GET /api/health
```

## Asynchronous Research API

Creating a research request returns:

```text
202 Accepted
```

The response contains the research request ID.

The frontend can then request:

```text
GET /api/research/:id
```

until the research request reaches either:

```text
completed
```

or

```text
failed
```

This keeps long-running AI research work out of the normal HTTP request lifecycle.

## Current Status

### Completed

* [x] Node.js + Express backend
* [x] PostgreSQL database
* [x] Database schema and migrations
* [x] User authentication
* [x] JWT authorization
* [x] Research request APIs
* [x] Research history
* [x] Research details
* [x] Web search
* [x] Web page extraction
* [x] Cohere LLM integration
* [x] Tool-calling research agent
* [x] Document ingestion
* [x] Document chunking
* [x] Embeddings
* [x] pgvector storage
* [x] Vector similarity retrieval
* [x] RAG integration with research agent
* [x] Research reports
* [x] Research source persistence
* [x] Redis
* [x] BullMQ
* [x] Background research worker
* [x] Retry handling
* [x] Failure handling
* [x] User data isolation

### In Progress

* [ ] React frontend integration
* [ ] Research status polling
* [ ] Document management UI
* [ ] Authentication UI

### Planned

* [ ] Dockerize the complete application
* [ ] Automated testing
* [ ] Production deployment
* [ ] Final documentation
* [ ] Architecture diagrams and screenshots

## Future Research Flow

The final application will provide a user interface where users can:

```text
Login
  │
  ▼
Dashboard
  │
  ├── Research
  │     │
  │     ▼
  │   Ask Question
  │     │
  │     ▼
  │   Research Agent
  │     │
  │     ▼
  │   Generated Report
  │
  └── Knowledge Base
        │
        ▼
      Upload Documents
        │
        ▼
      RAG Retrieval
```

## Project Goal

This project is designed to demonstrate practical implementation of modern AI application architecture, including:

* LLM tool calling
* Agentic workflows
* Retrieval-Augmented Generation
* Vector databases
* Background job processing
* API design
* Authentication and authorization
* Persistent data storage
* Asynchronous processing

The emphasis is on building an AI system whose architecture can be understood, tested, and explained rather than treating the LLM as a magical black box.
