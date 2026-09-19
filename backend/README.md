# RESONANT AI Backend

FastAPI service implementing the AI half of the RESONANT platform: an API
gateway, a LangGraph agent, a RAG pipeline, guardrails, memory and LLMOps
instrumentation.

## Runs with zero infrastructure

Every external dependency is optional. With no configuration the service uses an
in-process vector store, SQLite, an in-memory cache and an offline grounded
generator — so `pytest`, CI and a laptop all work without Docker or API keys.
Set environment variables to upgrade each layer independently.

| Concern          | Default            | Production option                                  |
| ---------------- | ------------------ | -------------------------------------------------- |
| Vector store     | in-process numpy   | Qdrant (`VECTOR_STORE=qdrant`)                     |
| Relational DB    | SQLite             | PostgreSQL (`DATABASE_URL=postgresql+psycopg://…`) |
| Cache / sessions | in-memory          | Redis (`CACHE_BACKEND=redis`)                      |
| LLM              | offline extractive | OpenAI / Anthropic / Ollama (`LLM_PROVIDER=…`)     |
| Embeddings       | hashed n-grams     | OpenAI (`EMBEDDING_PROVIDER=openai`)               |

## Quick start

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs. The bundled knowledge corpus in `data/knowledge`
is indexed automatically on first boot.

## Endpoints

| Method         | Path                           | Purpose                                                      |
| -------------- | ------------------------------ | ------------------------------------------------------------ |
| `GET`          | `/health`                      | Component-level health (vector store, DB, cache, LLM)        |
| `GET`          | `/ready`                       | Readiness — true once chunks are indexed                     |
| `GET`          | `/metrics`                     | Prometheus metrics                                           |
| `POST`         | `/api/v1/chat`                 | Agent turn: routing, retrieval, tools, guardrails, citations |
| `POST`         | `/api/v1/rag/query`            | Raw retrieval with scores and citations                      |
| `POST`         | `/api/v1/rag/documents/text`   | Ingest text / Markdown / HTML                                |
| `POST`         | `/api/v1/rag/documents/file`   | Ingest an uploaded file (PDF, MD, TXT, HTML)                 |
| `GET`/`DELETE` | `/api/v1/rag/documents[/{id}]` | List or remove documents                                     |
| `GET`          | `/api/v1/tools`                | Tool catalog with permission flags                           |
| `GET`/`DELETE` | `/api/v1/memory/{user_id}`     | Inspect or erase long-term memory                            |

## Agent graph

```
guard_input ─(blocked)─► END
     │
     └─► plan ─┬─(retrieve)─► retrieve ─┐
               ├─(tool)─────► tools ────┤─► generate ─► evaluate ─┬─(weak)─► reflect ─► retrieve
               └─(direct)───────────────┘                          └─(ok)───► guard_output ─► END
```

`plan` routes actionable requests ("recommend something dark", "how many
tracks") to tools and explanatory questions to retrieval. `evaluate` scores
groundedness and can trigger one Reflexion re-query.

## Testing

```bash
python -m pytest tests -q        # 56 unit + API tests
python -m app.eval.harness       # golden-set RAG/agent evaluation
ruff check . && ruff format --check .
```

The evaluation harness scores retrieval hit rate, required-fact accuracy,
routing accuracy, groundedness and safety-block accuracy, and exits non-zero
below the configured pass rate — wire it into CI as a release gate.

## Configuration

See `app/config.py`. Common variables:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
VECTOR_STORE=qdrant
QDRANT_URL=http://localhost:6333
CACHE_BACKEND=redis
DATABASE_URL=postgresql+psycopg://resonant:resonant@localhost:5432/resonant
API_KEYS=["your-key"]          # empty disables auth (local dev)
RATE_LIMIT_REQUESTS=60
GROUNDEDNESS_THRESHOLD=0.35
```
