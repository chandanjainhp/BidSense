# BidSense — AI-Powered RFP Management Platform

BidSense is a full-stack Request for Proposal (RFP) platform: create and publish RFPs, invite vendors, collect proposals, and score/compare them with an LLM.

![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Build-rolldown--vite-645DFF)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%204-38B2AC)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-asyncpg-336791)
![Python](https://img.shields.io/badge/Python-3.11+-green)

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Repository Layout](#repository-layout)
4. [Setup](#setup)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Data Model](#data-model)
8. [Frontend Routes](#frontend-routes)
9. [Current Limitations](#current-limitations)
10. [Additional Documentation](#additional-documentation)

---

## Architecture
<a name="architecture"></a>

```
┌─────────────────────────────────────────────────────────┐
│  client/  — React 19 + Vite + Tailwind CSS 4            │
│  react-router-dom · react-hook-form + zod · axios       │
│  framer-motion · React Context (theme, toasts)          │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP/JSON, Bearer JWT
┌──────────────────────────▼──────────────────────────────┐
│  server/  — FastAPI (app/main.py)                       │
│  app/api/v1/*   routers mounted under /api              │
│  app/services/  auth_service, ai_service                │
│  app/models/    SQLAlchemy 2.0 async ORM models         │
│  app/schemas/   Pydantic v2 request/response schemas    │
│  app/core/      config, security (JWT/bcrypt), deps     │
└───────┬──────────────────┬──────────────────┬───────────┘
        │                  │                  │
   PostgreSQL           Redis            OpenAI-compatible
   (asyncpg)      (OTP rate limiting)     LLM API (httpx)
```

Key flows:

1. **Auth** — register → OTP (hashed in the `otp_codes` table, resend rate-limited in Redis) → verify → JWT access + refresh tokens.
2. **RFP lifecycle** — create draft → edit `document` (JSONB) → publish → send to vendors (creates `RfpInvitation` rows with unique tokens) → events recorded in `RfpEvent`.
3. **Vendor submission** — vendors use the public `/api/invitations/{token}` endpoints (no auth) to view an RFP and submit a proposal.
4. **AI scoring** — `POST /api/proposals/{id}/score` calls `AIService.score_proposal`, which uses an OpenAI-compatible chat API and falls back to deterministic offline scoring when `AI_API_KEY` is unset.

---

## Tech Stack
<a name="tech-stack"></a>

### Frontend (`client/package.json`)

| Package | Version | Purpose |
|---|---|---|
| react / react-dom | ^19.2 | UI |
| vite (`npm:rolldown-vite`) | 7.2.5 | Dev server & build |
| react-router-dom | ^7.18 | Routing |
| tailwindcss + @tailwindcss/vite | ^4.3 | Styling |
| axios | ^1.18 | HTTP client |
| react-hook-form + zod + @hookform/resolvers | — | Forms & validation |
| framer-motion | ^12 | Animations |
| react-helmet-async | ^2 | Document head |
| eslint | ^9 | Linting |

### Backend (`server/requirements.txt`)

| Package | Version | Purpose |
|---|---|---|
| fastapi | 0.115.6 | Web framework |
| uvicorn[standard] | 0.34.0 | ASGI server |
| sqlalchemy[asyncio] | 2.0.36 | Async ORM |
| asyncpg | 0.30.0 | PostgreSQL driver |
| alembic | 1.14.0 | Migrations (declared; no migration scripts yet) |
| pydantic / pydantic-settings | 2.10.4 / 2.7.0 | Schemas & settings |
| python-jose[cryptography] | 3.3.0 | JWT |
| bcrypt (via passlib[bcrypt]) | 1.7.4 | Password hashing |
| redis | 5.2.1 | OTP rate limiting |
| httpx | 0.28.1 | LLM API calls |
| aiosmtplib | 3.0.2 | Email (declared; sending not wired up yet) |
| pytest / pytest-asyncio | 8.3.4 / 0.24.0 | Tests |

---

## Repository Layout
<a name="repository-layout"></a>

```
BidSense/
├── client/                      # React frontend
│   └── src/
│       ├── api/axios.js         # Axios instance + Bearer token interceptor
│       ├── services/            # authService, rfpService, dashboardService
│       ├── pages/               # Route-level pages
│       ├── components/          # auth, chat, dashboard, rfp, vendor, ... groups
│       ├── context/             # ThemeContext, ToastContext
│       ├── schemas/             # zod form schemas
│       └── App.jsx              # Route table
│
├── server/                      # FastAPI backend
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # App factory, CORS, /health, /api/docs
│       ├── api/v1/              # auth, users, vendors, rfps, proposals,
│       │                        # chat, notifications, dashboard, settings,
│       │                        # invitations, router.py
│       ├── core/                # config.py, security.py, dependencies.py, exceptions.py
│       ├── db/                  # base.py (engine/session/Base), init_db.py (create + seed)
│       ├── models/              # SQLAlchemy models
│       ├── schemas/             # Pydantic schemas
│       └── services/            # auth_service.py, ai_service.py
│
└── docs/                        # Architecture, requirements, and delivery plan
```

---

## Setup
<a name="setup"></a>

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (used for OTP flows)
- Optional: an OpenAI-compatible API key for live AI features

### 1. Backend

```bash
cd server
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `server/.env` (see [Configuration](#configuration)); `DATABASE_URL` is the only required variable.

Create the tables and seed demo data:

```bash
python -m app.db.init_db
```

This seeds a verified demo user (`demo@bidsense.io` / `Demo@1234`), five vendors, four RFPs, proposals and activity rows.

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

- API root: `http://localhost:8000/api`
- Swagger UI: `http://localhost:8000/api/docs`
- Health check: `http://localhost:8000/health`

### 2. Frontend

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

Set this explicitly — `client/src/api/axios.js` falls back to `http://localhost:5000/api`, which does not match the backend's default port.

Other client scripts: `npm run build`, `npm run preview`, `npm run lint`.

---

## Configuration
<a name="configuration"></a>

All backend settings are read from `server/.env` by `app/core/config.py` (Pydantic Settings, case-sensitive).

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | *(required)* | `postgresql://user:pass@host:5432/bidsense`; rewritten to `postgresql+asyncpg://` automatically. A `?sslmode=...` query param triggers an SSL context and is stripped before connecting. |
| `REDIS_URL` | `redis://localhost:6379/0` | Used by the auth/OTP service |
| `SECRET_KEY` | `change-this-secret-key-in-production` | JWT signing key (HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `14` | Refresh token lifetime |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated |
| `AI_PROVIDER` | `openai` | — |
| `AI_API_KEY` | `""` | Empty ⇒ offline fallback responses/scores |
| `AI_MODEL` | `gpt-4o-mini` | Chat/scoring model |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | example values | Reserved for outbound email (not yet sent) |
| `MEDIA_ROOT` | `/workspace/server/media` | Upload directory (avatars) |
| `MAX_UPLOAD_SIZE_MB` | `10` | Upload limit |
| `APP_ENV` | `development` | — |
| `DEBUG` | `true` | Enables SQL echo and returns `debug_otp` in auth responses |

Frontend: `VITE_API_URL` only.

---

## API Reference
<a name="api-reference"></a>

Everything is mounted under `/api`; interactive docs live at `/api/docs`. All routes require an `Authorization: Bearer <access token>` header except `/api/auth/*` and `/api/invitations/*`.

### Authentication — `/api/auth`

| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create an unverified user and issue an OTP (`debug_otp` returned when `DEBUG=true`) |
| POST | `/verify-otp` | Verify OTP, mark user verified, return user + tokens |
| POST | `/resend-otp` | Reissue a registration OTP |
| POST | `/login` | Email/password login → user + access & refresh tokens |
| POST | `/refresh` | Exchange refresh token for a new access token |
| POST | `/forgot-password` | Issue a reset OTP (always returns a generic message) |
| POST | `/reset-password` | Set a new password using the reset OTP |
| POST | `/logout` | No-op acknowledgement; refresh tokens are not revoked yet |
| GET | `/me` | Current user |

### Users — `/api/users`

`GET /me` · `PATCH /me` · `PUT /me/password` · `POST /me/avatar`

### Vendors — `/api/vendors`

`GET /` (list, filterable) · `POST /` · `GET /metrics` · `GET /{vendor_id}` · `PATCH /{vendor_id}` · `DELETE /{vendor_id}`

### RFPs — `/api/rfps`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List the current user's RFPs |
| POST | `/` | Create an RFP (draft) |
| GET | `/{rfp_id}` | Fetch one RFP |
| PATCH | `/{rfp_id}` | Update RFP fields |
| PATCH | `/{rfp_id}/document` | Update the JSONB `document` body |
| POST | `/{rfp_id}/publish` | Publish (status → `open`, sets `published_at`) |
| POST | `/{rfp_id}/send` | Create tokenized invitations for `vendor_ids` |
| GET | `/{rfp_id}/analytics` | Invitation/proposal statistics |
| GET | `/{rfp_id}/history` | `RfpEvent` audit trail |
| DELETE | `/{rfp_id}` | Delete an RFP |

### Proposals — `/api/proposals`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List proposals for the user's RFPs |
| GET | `/compare?ids=<uuid,uuid>` | Side-by-side comparison payload |
| GET | `/{proposal_id}` | Proposal detail |
| PATCH | `/{proposal_id}/status` | Update status |
| POST | `/{proposal_id}/score` | Run AI scoring (202; executed inline today) |

### Chat — `/api/chat`

`GET /conversations` · `POST /conversations` · `DELETE /conversations/{id}` · `GET /conversations/{id}/messages` · `POST /conversations/{id}/messages` (streams the assistant reply; offline fallback when no `AI_API_KEY`)

### Notifications — `/api/notifications`

`GET /` · `GET /unread-count` · `PATCH /{notification_id}/read` · `POST /read-all`

### Dashboard — `/api/dashboard`

`GET /stats` · `GET /activity`

### Settings — `/api/settings`

`GET|PATCH /notifications` (email/push/digest frequency) · `GET|PATCH /ai` (tone, auto-score, suggestions)

### Public vendor invitations — `/api/invitations` (no auth)

`GET /{token}` — view the invited RFP · `POST /{token}/view` — mark viewed · `POST /{token}/proposal` — submit a proposal

---

## Data Model
<a name="data-model"></a>

PostgreSQL via SQLAlchemy 2.0 (`server/app/models/`). All primary keys are UUIDs.

| Model | Table | Notable fields |
|---|---|---|
| `User` | `users` | `full_name`, `email` (unique), `hashed_password`, `is_verified`, `avatar_url`, `last_login_at` |
| `OtpCode` | — | `user_id`, `purpose`, `code_hash`, `expires_at`, `attempts`, `consumed` |
| `Vendor` | `vendors` | `owner_user_id`, `name`, `industry`, `website`, `contact_name`, `email`, `phone`, `status` (`active`/`pending`/`inactive`) |
| `Rfp` | `rfps` | `created_by`, `title`, `type`, `department`, `budget`, `due_date`, `description`, `status` (`draft`/`open`/`closed`/`awarded`/`cancelled`), `document` (JSONB), `published_at` |
| `RfpInvitation` | — | `rfp_id`, `vendor_id`, `invitation_token` (unique), `status`, `viewed_at`, `submitted_at` |
| `RfpEvent` | — | `rfp_id`, `actor_type`, `actor_name`, `action`, `detail` — audit trail |
| `Proposal` | `proposals` | `rfp_id`, `vendor_id`, `amount`, `status` (`pending`/`under_review`/`scored`/`shortlisted`/`rejected`), `ai_score`, `ai_summary`, `technical_score`, `pricing_score`, `experience_score`, `document_url` |
| `Conversation` / `Message` | — | AI chat threads, `role` ∈ user/assistant |
| `Notification` | — | `notification_type`, `title`, `body`, `is_read`, `related_rfp_id` |
| `Activity` | — | `actor_name`, `action`, `target` — dashboard feed |
| `UserSettings` | — | notification toggles, `digest_frequency`, `ai_tone`, `ai_auto_score`, `ai_suggestions` |

Schema is created by `app/db/init_db.py` (`Base.metadata.create_all`). Alembic is installed but no migration scripts exist yet.

---

## Frontend Routes
<a name="frontend-routes"></a>

Defined in `client/src/App.jsx`.

- **Auth**: `/login`, `/signup`, `/forgot-password`, `/otp-verification`
- **App** (inside `Layout`): `/dashboard`, `/chat`, `/rfps`, `/rfps/create`, `/rfps/editor`, `/rfps/send`, `/rfps/analytics`, `/rfps/history`, `/proposals`, `/proposals/compare`, `/vendors`, `/vendors/add`, `/notifications`, `/settings`
- **Marketing/public**: `/`, `/pricing`, `/features`, `/enterprise`, `/security`, `/about`, `/careers`, `/blog`, `/contact`, `/docs`, `/api`, `/guides`, `/support`, `/terms`, `/privacy`

---

## Current Limitations
<a name="current-limitations"></a>

- **Email is not sent.** `POST /api/rfps/{id}/send` creates invitation records only; SMTP settings and `aiosmtplib` are in place but unused. OTPs are surfaced via `debug_otp` in responses while `DEBUG=true`.
- **No migrations.** Schema changes require re-running `app/db/init_db.py` (or adding Alembic revisions).
- **Scoring runs inline.** `/proposals/{id}/score` returns 202 but performs the AI call during the request; no worker queue is wired up.
- **No automated test suite yet**, although pytest/pytest-asyncio are installed.
- **Logout does not revoke tokens** — `POST /api/auth/logout` only returns a message; there is no refresh-token blacklist.
- **Frontend API base URL default** (`http://localhost:5000/api`) does not match the backend default port; set `VITE_API_URL`.


---

## Additional Documentation
<a name="additional-documentation"></a>

`docs/` holds the architecture and requirements set, all written against this Python stack. Start with `docs/README.md` for the index, `docs/FunctionalRequirements.md` §2.19 for what is actually built today, and `docs/ImplementationPlan.md` for the order the remaining modules are delivered in.
