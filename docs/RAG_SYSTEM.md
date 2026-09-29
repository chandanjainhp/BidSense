# BidSense RAG System — Detailed Documentation

A complete **R**etrieval-**A**ugmented **G**eneration system built into the BidSense FastAPI backend. Users upload documents into a per-user knowledge base; the AI chat and dedicated Q&A endpoints then answer questions grounded in those documents, with citations pointing back to the exact file and passage used.

- **Vector store:** PostgreSQL + [pgvector](https://github.com/pgvector/pgvector) (HNSW index, cosine distance)
- **Embeddings:** any OpenAI-compatible API when `AI_API_KEY` is set; deterministic offline hash fallback otherwise (no key needed to try it)
- **Ingestion:** PDF (`pdfminer.six`), DOCX (`python-docx`), plain text, Markdown

---

## 1. Architecture Overview

```
 ┌────────┐    1. Upload     ┌──────────────────────────── SERVER (FastAPI) ───────────────────────────┐
 │ Client │ ───────────────► │  POST /api/documents                                                     │
 └────────┘                  │      │                                                                   │
      │                      │      ▼ 2. Ingestion pipeline (rag_service.ingest_document)               │
      │                      │  ┌────────────┐   ┌────────────┐   ┌──────────────┐   ┌───────────────┐  │
      │                      │  │  Extract   │──►│   Chunk    │──►│   Embed      │──►│ Store + Index │  │
      │                      │  │ pdf/docx/  │   │ ~1000 chars│   │ API or       │   │ pgvector      │  │
      │                      │  │ txt/md     │   │ 200 overlap│   │ offline hash │   │ HNSW (cosine) │  │
      │                      │  └────────────┘   └────────────┘   └──────────────┘   └───────────────┘  │
      │                      │                                                                          │
      │   3. Ask / chat      │  ┌────────────────────── Retrieval (per query) ────────────────────────┐ │
      └────────────────────► │  │ query → embed ──► pgvector cosine top-25 ─┐                         │ │
                             │ │                                           ├─► blend (α=0.7)        │ │
      ◄── answer + sources ──│ │ query terms ───► keyword ILIKE top-25 ────┘   → light rerank        │ │
                             │ └─────────────────────────────────────────────────────────────────────┘ │
                             │      │                                                                  │
                             │      ▼ 4. Generation                                                    │
                             │  system prompt (rules + numbered context block) + question → LLM        │
                             └─────────────────────────────────────────────────────────────────────────┘
```

**Data flow at a glance:** upload → extract → chunk → embed → store; question → retrieve → build context → LLM → answer with `[source: filename]` citations and a structured `sources[]` list.

---

## 2. The Pipeline in Detail

### 2.1 Text extraction (`rag_service.extract_text`)
| Type | Method |
|---|---|
| `.pdf` | `pdfminer.high_level.extract_text` (pure-Python, handles most text PDFs) |
| `.docx` | `python-docx`: paragraphs first, then table rows joined with ` \| ` |
| `.txt`, `.md` | UTF-8 decode with `errors="replace"` |
| anything else | best-effort UTF-8 decode (treated as raw text) |

### 2.2 Chunking (`rag_service.chunk_text`)
Document text is split into overlapping chunks tuned for retrieval quality:

- **Target size:** `CHUNK_SIZE = 1000` characters
- **Overlap:** `CHUNK_OVERLAP = 200` characters carried between consecutive chunks, so statements that straddle a boundary survive in at least one chunk
- **Strategy:** paragraph-aware — paragraphs ≤ 1000 chars are kept whole; long paragraphs are split on sentence boundaries (`[.!?]`); pathological sentences longer than a chunk are hard-split
- **Filter:** chunks shorter than `MIN_CHUNK_LEN = 40` chars are dropped (headers/whitespace noise)

### 2.3 Embedding (`RagService.embed_texts`)
- **Online mode** (when `AI_API_KEY` is set): calls `POST {AI_BASE_URL}/embeddings` with `AI_EMBEDDING_MODEL` (default `text-embedding-3-small` → 1536 dims), batched 32 at a time, results re-ordered by the API's `index` field. Any failure silently falls back to offline mode so ingestion never breaks.
- **Offline mode** (no API key): deterministic **hashed bag-of-words** — each token is MD5-hashed into one of 1536 buckets, weighted by `1 + ln(count)`, then L2-normalized. Same tokenizer is used for queries, so cosine similarity gives a real, reproducible relevance signal with zero external dependencies. Quality is below a neural embedding model but fully functional for development.

### 2.4 Storage (`models/document.py`)
Two tables, created by `init_db` (which also runs `CREATE EXTENSION IF NOT EXISTS vector`):

- **`documents`** — `id`, `user_id` (per-user isolation), `filename`, `file_type`, `size_bytes`, `status` (`processing` → `ready` / `failed`), `chunk_count`, `error_message`, `created_at`
- **`document_chunks`** — `id`, `document_id` (cascade delete), `chunk_index`, `content`, `embedding vector(1536)`
  - HNSW index: `ix_document_chunks_embedding_hnsw` with `m=16`, `ef_construction=64`, `vector_cosine_ops`

Ingestion is transactional per document: if extraction, chunking, or embedding throws, the `Document` row is kept with `status=failed` and the error message stored — nothing half-indexed is ever searchable (retrieval filters on `status = ready`).

### 2.5 Hybrid retrieval (`RagService.retrieve`)
For a query, up to `top_k` chunks are returned, blended from two independent searches:

1. **Semantic** — embed the query, `ORDER BY embedding <=> query_vec LIMIT 25` (cosine distance via the HNSW index), score = `1 − distance`
2. **Keyword** — tokenize the query (alnum, lowercase, terms ≥ 3 chars, max 8 terms), `ILIKE %term%` OR-match over chunk content, score = fraction of query terms present in the chunk
3. **Blend** — `score = 0.7 × semantic + 0.3 × keyword` for chunks found by both (`HYBRID_ALPHA = 0.7`)
4. **Light rerank** — +0.05 per query term re-found in the top candidates (cheap lexical precision boost), capped at 1.0

Modes: `hybrid` (default), `semantic`, or `keyword` — selectable per request.

### 2.6 Context building & generation
`build_context_block` formats the top chunks as a numbered block (`[1] (source: file, chunk n) …`), capped at `MAX_CONTEXT_CHARS = 6000`. `build_rag_system_prompt` wraps it with rules: answer primarily from the context, cite as `[source: filename]`, and say plainly when the context doesn't contain the answer. The chat endpoint passes this prompt through `ai_service.chat`, which supports a caller-provided system prompt (`context["system_prompt"]`).

---

## 3. API Reference (`/api/documents`, all authenticated with `Bearer <JWT>`)

### 3.1 Upload & ingest
```http
POST /api/documents
Content-Type: multipart/form-data
  file: <pdf | docx | txt | md, ≤ MAX_UPLOAD_SIZE_MB (default 10 MB)>
```
```json
{
  "id": "69c2512b-4a03-47a8-9c98-5c4ab33a5f57",
  "filename": "procurement-policy.md",
  "file_type": "md",
  "size_bytes": 819,
  "status": "ready",
  "chunk_count": 1,
  "error_message": null,
  "created_at": "2026-09-19T06:31:03.863492Z"
}
```
Errors: `400` unsupported type / empty file · `413` over size limit. `status` may be `failed` with `error_message` (e.g. scanned PDF with no extractable text).

### 3.2 List documents
```http
GET /api/documents
```
→ `{ "items": [DocumentPublic…], "total": n }` (newest first).

### 3.3 Knowledge-base stats
```http
GET /api/documents/stats
```
→ `{ "documents": 1, "chunks": 1, "ready_documents": 1, "failed_documents": 0 }`

### 3.4 Search (retrieval only, no LLM)
```http
POST /api/documents/search
{ "query": "Who approves budgets above 500000?", "top_k": 5, "mode": "hybrid" }
```
→ `{ query, mode, results: [{ document_id, filename, chunk_index, content, score }] }` — `score` higher = more relevant, roughly 0–1.

### 3.5 Ask (one-shot RAG Q&A)
```http
POST /api/documents/ask
{ "question": "What is the deadline extension policy?", "top_k": 5 }
```
→ `{ question, answer, sources: [RetrievedChunk…] }` — the answer text plus the exact chunks used as evidence. Does not touch chat history.

### 3.6 Delete
```http
DELETE /api/documents/{document_id}
```
Removes the document and cascades to all of its chunks (vectors included).

### 3.7 Inspect chunks (debugging)
```http
GET /api/documents/{document_id}
```
Returns every chunk of a document in order — useful for tuning chunk size/overlap.

### 3.8 Chat integration (automatic)
`POST /api/chat/conversations/{id}/messages` now returns the normal message **plus**:
```json
{ "role": "ai", "content": "…", "sources": [
  { "document_id": "…", "filename": "procurement-policy.md", "chunk_index": 0, "score": 0.465, "excerpt": "…" }
]}
```
Retrieval failures degrade gracefully: chat falls back to plain (non-RAG) conversation. The response shape is additive and backward-compatible.

---

## 4. Configuration (`server/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `AI_API_KEY` | *(empty)* | Set to enable real LLM answers + neural embeddings. Empty = offline hash embeddings + offline chat fallback. |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint (e.g. Ollama, vLLM, Azure gateways). |
| `AI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model. **Must produce 1536-dim vectors** or change `EMBED_DIM` in `rag_service.py` *before* ingesting (dimension is fixed per column). |
| `AI_MODEL` | `gpt-4o-mini` | Chat/completion model used for answers. |
| `MAX_UPLOAD_SIZE_MB` | `10` | Upload cap. |
| `DATABASE_URL` | — | Must point at a Postgres **with the vector extension available** (see §6). |

---

## 5. Data Isolation & Security
- Every query and every ingestion is scoped by `user_id` — users can never retrieve or even see each other's documents.
- Uploads are validated by extension whitelist (`pdf`, `docx`, `txt`, `md`) and size cap; file bytes are never written to disk — text is extracted in memory.
- Endpoints require a valid JWT; failed ingestion keeps diagnostics (`error_message`) but never exposes partial data.

---

## 6. Local Setup / Operations

### One-time migration (idempotent — safe to re-run)
```bash
cd server
uv sync                      # installs pgvector, pdfminer.six, python-docx
uv run python -m app.db.init_db
```
`init_db` creates the `vector` extension, `documents`/`document_chunks` tables, the HNSW index, and (if missing) the demo seed data.

### Database requirement
Postgres must have the `vector` extension **available on the server filesystem**. The repo's `docker-compose.yml` now uses the `pgvector/pgvector:pg16` image (drop-in replacement for `postgres:16-alpine`, same volume/credentials — data is preserved). If you swap images later, `docker compose up -d` after editing the `image:` line.

### Quick smoke test
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"demo@bidsense.io","password":"Demo@1234"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -X POST http://localhost:8000/api/documents -H "Authorization: Bearer $TOKEN" -F "file=@./policy.md"
curl -X POST http://localhost:8000/api/documents/search -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"query":"budget approval threshold","top_k":3}'
```

### Verify the vector index
```bash
docker exec local-database psql -U bidsense -d bidsense \
  -c "SELECT indexname FROM pg_indexes WHERE tablename='document_chunks';"
# expect: ix_document_chunks_embedding_hnsw
```

---

## 7. Tuning Guide

| Knob | Where | Effect |
|---|---|---|
| `CHUNK_SIZE` (1000) | `rag_service.py` | Bigger chunks = more context per hit but fuzzier embeddings; smaller = sharper retrieval, more chunks. |
| `CHUNK_OVERLAP` (200) | `rag_service.py` | Higher overlap reduces statements lost at boundaries (at ~20% storage cost). |
| `HYBRID_ALPHA` (0.7) | `rag_service.py` | 1.0 = pure semantic; 0.0 = pure keyword. Lower it if exact IDs/numbers matter more than meaning. |
| `TOP_K` / `top_k` | per request | More context vs. prompt cost; context is capped by `MAX_CONTEXT_CHARS` regardless. |
| `SEMANTIC_CANDIDATES` / `KEYWORD_CANDIDATES` (25) | `rag_service.py` | Recall of the pre-blend candidate pool. |
| HNSW `m` / `ef_construction` | `models/document.py` | Index build quality vs. speed/memory. For >100k chunks also consider raising `hnsw.ef_search` per session. |

---

## 8. Known Limitations & Roadmap
- **Offline embeddings** are bag-of-words hashed — no synonymy or cross-language understanding. Set `AI_API_KEY` for production-quality retrieval.
- **Scanned/image PDFs** yield no text via pdfminer (no OCR). They ingest as `failed` with a clear error; add an OCR stage (e.g. Tesseract) if needed.
- **Embedding dimension is fixed at 1536.** Switching to a different-dim model requires dropping/re-creating `document_chunks.embedding` and re-ingesting all documents.
- **No re-chunking on update** — documents are immutable once ingested; re-upload to replace (delete + upload).
- Roadmap ideas: async background ingestion queue, per-chunk page numbers for PDF citation jump links, `top_k` auto-tuning from query length, Redis-cached query embeddings.
