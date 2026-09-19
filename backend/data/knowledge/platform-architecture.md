# RESONANT Platform Architecture

## Layers

The platform follows an end-to-end AI application architecture with ten blocks:
frontend, API gateway, AI orchestrator, core AI services, RAG pipeline, knowledge
and data, LLM models, guardrails and safety, memory and state, and deployment
with LLMOps.

## Frontend

The user interface is a Next.js 15 application using the App Router and React 19.
It renders the emotional compass, artwork-driven track cards, a floating mini
player and an Ask panel that talks to the AI backend. Styling uses Tailwind CSS
version 4 and a liquid glass material system with four glass tiers.

## API gateway

The backend is a FastAPI service. Every request passes through a middleware
pipeline that assigns a correlation request id, enforces a fixed-window rate
limit, records Prometheus metrics and emits a structured JSON log line. API key
authentication is enforced whenever any key is configured.

## AI orchestrator

The agent is a LangGraph state machine. Its nodes are guard_input, plan,
retrieve, tools, generate, evaluate, reflect and guard_output. The planner routes
a question to retrieval, to a tool call, or to a direct answer. After generation
the evaluator measures groundedness; if support is weak the graph enters a
Reflexion loop that rewrites the query and retrieves again, bounded to two
attempts.

## RAG pipeline

Retrieval runs in five stages: query, embedding, vector search, reranking and
relevant context assembly. Vector search returns the top twelve candidates by
cosine similarity. The reranker combines 55 percent vector score with 45 percent
lexical evidence, applies heading boosts and caps each document at two chunks, and
returns the top four. Context blocks are numbered so the model can cite them.

## Knowledge and data

Ingestion parses plain text, Markdown, HTML and PDF. Text is cleaned, split on
paragraph and heading boundaries, then packed into chunks of about 900 characters
with 150 characters of overlap. Every chunk stores document id, title, source,
section heading and character offsets so answers can be traced back to a source.

## Storage

Vectors live in Qdrant in production and in an in-process numpy store during
development and CI. Relational data uses PostgreSQL in production and SQLite
locally. Redis backs the cache and session store, with an in-memory fallback.
Uploaded files and artifacts go to object storage.

## Deployment

The frontend and backend are containerised. Images build from multi-stage
Dockerfiles and run as non-root users. Continuous integration runs linting, type
checking, unit tests, an end-to-end suite and the RAG evaluation harness before a
build is promoted.
