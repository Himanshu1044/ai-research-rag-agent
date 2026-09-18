# API Reference

Base URL during local development:

``` text
http://localhost:5000
```

## Authentication

### Register

``` http
POST /api/auth/register
Content-Type: application/json
```

Request:

``` json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Login

``` http
POST /api/auth/login
Content-Type: application/json
```

Response contains a JWT:

``` json
{
  "message": "Login successful",
  "token": "..."
}
```

Use the token for protected endpoints:

``` http
Authorization: Bearer <token>
```

## Research

### Create Research Request

``` http
POST /api/research
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

``` json
{
  "question": "How is AI changing software development?"
}
```

The API returns `202 Accepted` after creating and queueing the research
request.

The response contains the research request ID.

### Research History

``` http
GET /api/research
Authorization: Bearer <token>
```

Returns the authenticated user's research requests.

### Research Details

``` http
GET /api/research/:id
Authorization: Bearer <token>
```

Returns the research request, report, and sources.

A request belonging to another user is not returned.

## Documents

### Create Document

``` http
POST /api/documents
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

``` json
{
  "title": "AI Software Development Notes",
  "source": "personal-notes",
  "content": "Document content..."
}
```

The backend stores the document, chunks the content, generates
embeddings, and stores the vectors.

### List Documents

``` http
GET /api/documents
Authorization: Bearer <token>
```

Returns documents belonging to the authenticated user.

## Health

``` http
GET /api/health
```

Used to verify that the API server is running.

## Research Status

Research requests use:

``` text
pending
running
completed
failed
```

Typical lifecycle:

``` text
pending → running → completed
                  ↘ failed
```

The frontend should poll:

``` http
GET /api/research/:id
```

after creating a research request until the status becomes `completed`
or `failed`.

## Security

Protected endpoints use JWT authentication.

Research details are filtered by both:

``` text
research_request_id
user_id
```

RAG retrieval is also filtered by the authenticated user's ID.

This prevents users from accessing another user's research or private
knowledge.
