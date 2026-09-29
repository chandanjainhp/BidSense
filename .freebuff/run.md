# BidSense — Run Guide

Two processes: the FastAPI backend (port 8000) and the Vite dev server (port 5173, the preview).

## Artifacts to reproduce in a fresh checkout

1. **Client deps** — package manager is **bun**:
   ```bash
   cd client && bun install --frozen-lockfile
   ```
2. **Server deps** — package manager is **uv** (Python project in `server/`):
   ```bash
   cd server && uv sync
   ```
3. **Env files** — copy from the main checkout (values are machine-specific, never commit):
   - `server/.env` — must exist. Key detail: `REDIS_URL=redis://localhost:6380/0` (Docker Redis maps 6380, not the default 6379).
   - `client/.env` — `VITE_API_URL=http://localhost:8000/api`.
4. **Docker services** (Postgres + Redis): `docker compose up -d` from the repo root. Postgres must be healthy before the backend starts.

## Run the backend (port 8000)

```bash
cd server && setsid nohup uv run uvicorn app.main:app --reload --port 8000 > /tmp/bidsense-server.log 2>&1 < /dev/null &
```
- Health check: `curl http://localhost:8000/health` → 200.
- Seeded demo login: `demo@bidsense.io` / `Demo@1234` (re-seed with the init_db script if missing).

## Run the frontend (port 5173 — the preview)

```bash
cd client && setsid nohup bun run dev --host > .freebuff/preview-<thread>.log 2>&1 < /dev/null &
```
- `--host` is required (preview binds the loopback host).
- Check `kill -0 <pid>` after ~5s; if the runner reaped it, relaunch under `setsid`.

## Gotcha: stale Vite module graph

Vite's watcher sometimes misses edits to files that were already loaded (observed with
`client/src/api/axios.js`) — the browser keeps running the old module even after reload,
because the canonical URL serves the stale transform. Symptoms: source on disk is correct,
`curl http://localhost:5173/src/api/axios.js` shows old code, but a fresh `?t=` query param
shows the new code.

**Fix: restart the Vite dev server** (kill the pid, relaunch with the command above).
Do not just `touch` the file — it does not invalidate the cache.

## Auth/session notes

- Access JWT lifetime is 30 minutes; refresh token ~2 weeks. `client/src/api/axios.js` has a
  401 interceptor that silently refreshes and retries, so users should never see an expiry.
- Backend responses use **camelCase aliases** (`refreshToken`, `fullName`) via a pydantic
  `alias_generator` — client parsers must match.
