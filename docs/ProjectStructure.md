# 6. Project Structure

## 6.1 Overview

BidSense follows a modular, layered architecture designed for long-term maintainability and scalability.

The codebase is divided into two independent applications:

* Frontend (React) — `client/`
* Backend (FastAPI) — `server/`

Each application can be developed, tested, deployed, and scaled independently.

---

# 6.2 Repository Structure

```text
BidSense/
│
├── client/          # React frontend
├── server/          # FastAPI backend
├── docs/            # architecture and requirements documents
├── docker/
├── scripts/
├── .github/
├── LICENSE
├── README.md
└── docker-compose.yml
```

---

# 6.3 Frontend Structure

```text
client/
│
├── public/
├── src/
│
├── assets/
├── components/
├── layouts/
├── pages/
├── routes/
├── hooks/
├── context/
├── services/
├── api/
├── utils/
├── schemas/
├── constants/
├── store/
├── styles/
├── types/
└── main.jsx
```

---

## Frontend Folder Responsibilities

### assets/

Stores:

* Images
* Icons
* Fonts
* Static files

---

### components/

Reusable UI components.

Examples:

* Button
* Modal
* Card
* Table
* Input
* Sidebar
* Navbar

---

### layouts/

Application layouts.

Examples:

* Dashboard Layout
* Authentication Layout
* Public Layout

---

### pages/

Application pages.

Examples:

* Dashboard
* Vendors
* RFPs
* Proposals
* Chat
* Settings

---

### api/

Axios configuration.

Responsibilities:

* API client
* Interceptors
* Authentication headers

---

### services/

Business API wrappers.

Example:

```text
auth.service.js

vendor.service.js

proposal.service.js
```

---

### schemas/

Frontend Zod validation.

---

### hooks/

Custom React Hooks.

Examples:

* useAuth()
* useDebounce()
* usePagination()

---

### context/

Global Context Providers.

Examples:

* Theme
* Authentication
* Notifications

---

### store/

Client-side global state.

---

# 6.4 Backend Structure

```text
server/
│
├── app/
│   ├── api/v1/
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── schemas/
│   ├── repositories/
│   ├── services/
│   ├── providers/
│   ├── ai/
│   ├── prompts/
│   ├── workers/
│   ├── templates/
│   ├── utils/
│   └── main.py
│
├── alembic/
├── tests/
├── media/
├── alembic.ini
└── requirements.txt
```

---

# 6.5 Backend Layer Responsibilities

## core/

Centralized application configuration and cross-cutting primitives.

Contains:

* Environment settings (`pydantic-settings`)
* Security helpers (JWT, password hashing)
* Shared dependencies (current user, RBAC, pagination)
* Domain exceptions and handlers
* Logger configuration

---

## db/

Database layer.

Contains:

* Async engine and session factory
* Declarative `Base`
* Seed scripts

Migrations live in the top-level `alembic/` directory.

---

## models/

SQLAlchemy ORM models — one module per aggregate, all inheriting the shared `Base` with UUID primary keys, timestamps, and soft-delete columns.

---

## api/v1/

FastAPI router definitions.

Responsibilities:

* API endpoints
* Route grouping via `APIRouter(prefix=..., tags=...)`
* Dependency assignment
* Response models and status codes

Path operation functions read the validated request, call a service, and return the result. They must not contain business logic.

---

## services/

Business logic.

Responsibilities:

* Procurement logic
* Authentication
* AI orchestration
* Payments
* Notifications

Services coordinate repositories and providers.

---

## repositories/

Database abstraction.

Responsibilities:

* SQLAlchemy queries
* Transactions
* CRUD operations

Repositories never contain business rules.

---

## providers/

External integrations.

Examples:

* Gemini
* Sarvam AI
* Razorpay
* Cloudinary
* fastapi-mail (SMTP)

Providers isolate third-party SDKs from business logic.

---

## schemas/

Pydantic v2 request and response models.

Responsibilities:

* Body, query, and path validation (enforced by FastAPI, returning HTTP 422)
* Response serialization contracts
* Shared enums and pagination envelopes

Cross-cutting behaviour that is not per-endpoint — CORS, security headers, request logging, rate limiting — is registered as ASGI middleware in `app/main.py`; authentication, authorization, and session management are FastAPI dependencies in `app/core/dependencies.py`.

---

## workers/

Celery tasks for work that must not block a request: document parsing, embedding generation, report rendering, and scheduled digests.

---

## ai/

AI infrastructure.

Contains:

* RAG
* Embeddings
* Retrieval
* Prompt Builder
* Document Parser
* Chunking
* Memory
* AI pipelines

---

## prompts/

Version-controlled prompt templates.

Organized by domain:

* RFP
* Proposal
* Vendor
* Chat
* Compliance

---

## templates/

Email templates.

Examples:

* OTP
* Invoice
* Payment Success
* Invitation

---

## media/

Local file storage for development (object storage in production).

Folders:

* avatars/
* proposals/
* rfps/
* invoices/
* temp/

---

## utils/

Reusable helper functions.

Examples:

* JWT
* Password hashing
* Pagination
* Date formatting
* Constants

---

## API documentation

Generated by FastAPI from the routers and Pydantic schemas — Swagger UI at `/api/docs`, the OpenAPI 3 document at `/api/openapi.json`. There is no hand-maintained specification file.

---

# 6.6 Layer Communication

Every request follows the same flow.

```text
Client

↓

Middleware

↓

Router

↓

Dependencies

↓

Service

↓

Repository

↓

SQLAlchemy (async)

↓

PostgreSQL
```

External systems are accessed through providers.

```text
Service

↓

Provider

↓

Gemini

Sarvam

Razorpay

Cloudinary

SMTP
```

---

# 6.7 AI Architecture

```text
User

↓

AI Router

↓

AI Service

↓

RAG Pipeline

↓

Retriever

↓

Qdrant

↓

Prompt Builder

↓

Gemini

↓

Response
```

---

# 6.8 Payment Architecture

```text
Client

↓

Payment Router

↓

Payment Service

↓

Razorpay Provider

↓

Webhook

↓

Repository

↓

Database
```

---

# 6.9 File Processing Pipeline

```text
Upload

↓

Validation

↓

Storage

↓

Parser

↓

Chunking

↓

Embeddings

↓

Qdrant

↓

Metadata

↓

PostgreSQL
```

---

# 6.10 Design Principles

The project structure follows these principles:

* Modular architecture
* Feature isolation
* Single Responsibility Principle
* Clean Architecture
* Repository Pattern
* Service Layer Pattern
* Provider Pattern
* Dependency inversion
* Low coupling
* High cohesion

---

# 6.11 Summary

The BidSense project structure separates application concerns into independent layers with clearly defined responsibilities. Routers manage HTTP interactions, services implement business rules, repositories encapsulate database access through SQLAlchemy, and providers isolate external services such as AI models, payment gateways, email, and storage. This organization enables easier testing, maintenance, and future expansion while keeping the codebase consistent and scalable.
a