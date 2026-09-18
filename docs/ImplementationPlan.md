# Implementation Plan

This document is the delivery plan that turns the architecture documents in this folder into working software. It is the companion to the status table in `FunctionalRequirements.md` §2.19 — every module there carries the phase number it is delivered in.

## Ground rules

* **Stack**: the platform is built on the Python stack described in `TechnologyStack.md` — FastAPI, SQLAlchemy 2.0 (async) with Alembic, PostgreSQL, Redis, Celery, Qdrant, and a React 19 client. Documents that previously described an Express/Drizzle backend have been rewritten to match.
* **One phase, one pull request.** Each phase leaves the application runnable and testable.
* **Schema changes go through Alembic.** `Base.metadata.create_all` is only acceptable for throwaway test databases.
* **Every endpoint ships with tests** (pytest + `httpx.AsyncClient`) and appears in the generated OpenAPI schema.

## Phase 1 — Foundation

Goal: a reproducible environment and the scaffolding every later phase depends on.

* `docker-compose.yml` with PostgreSQL, Redis, and Qdrant.
* Alembic baseline migration generated from the existing models; seed script reworked to run after migrations.
* Standard response envelope and error codes from `API Architecture & Standards.md`, applied through exception handlers.
* Request-id middleware and structured JSON logging.
* `pytest` harness with a transactional test database and an ASGI client fixture.
* Ruff, Black, and mypy configuration plus a `pre-commit` hook.
* GitHub Actions workflow: lint, type check, backend tests, client lint and build.

## Phase 2 — Identity: auth, organizations, RBAC, audit, email

Goal: the multi-tenant and permission model that every other module is scoped by.

* `organizations`, `organization_members`, `roles`, `permissions`, `role_permissions` tables.
* Six roles — Super Admin, Organization Admin, Procurement Manager, Procurement Officer, Vendor, Viewer — with a `require_permission` dependency returning HTTP 403.
* `organization_id` added to every tenant-scoped table and enforced in the repository layer.
* Persisted `refresh_tokens` with rotation, revocation, and logout-all-devices; change-password endpoint.
* Organization invitations with expiring tokens.
* Immutable `audit_logs` written by middleware for authentication, data changes, and security events.
* `fastapi-mail` templates for OTP, password reset, organization invite, and vendor invite; the RFP invitation flow starts sending real email.

## Phase 3 — Core procurement

Goal: the procurement workflow end to end, without AI.

* Vendors: categories, contacts, documents, ratings, performance metrics, archive, and search/filter.
* RFPs: sections, version history, duplication, publish/close/award transitions, deadline handling, and vendor invitation tracking.
* Proposals: file submission, review workflow, side-by-side comparison, scoring persistence, shortlisting, and award recording.
* Notifications raised by each workflow transition, in-app and by email, honouring user preferences.

## Phase 4 — AI and RAG

Goal: the features that differentiate the product.

* Gemini provider behind the existing AI service interface, with Sarvam AI for Indian-language translation; the offline fallback stays for local development without keys.
* Document entity and upload pipeline: PDF, DOCX, XLSX, CSV, TXT, and images.
* Celery tasks for parsing, chunking, and embedding; processing status exposed on the document.
* Qdrant collections per organization, semantic search, and retrieval-backed chat with citations.
* AI RFP generation, proposal analysis, compliance checks, risk detection, executive summaries, and vendor recommendation.

## Phase 5 — Payments, subscriptions, and reporting

* Plans, subscriptions, and plan-based limits enforced in the service layer.
* Razorpay orders, signature verification, webhooks, failed-payment handling, and invoice PDFs.
* Procurement, vendor, proposal, and financial reports with PDF and Excel export, plus scheduled generation through Celery beat.

## Phase 6 — Frontend integration

* TanStack Query as the server-state layer; the axios base URL defaults to the FastAPI port.
* Every mock service in `client/src/services/` replaced with real API calls, starting with `rfpService.js`.
* Role-aware routing and navigation, live dashboard charts, notification centre, and upload flows.

## Phase 7 — Hardening and deployment

* Rate limiting, security headers, and the controls in `Security Architecture.md`.
* Test coverage raised to the targets in `Testing Architecture.md`.
* Multi-stage Docker image, Nginx reverse proxy, and the deployment pipeline in `DevOps & Deployment Architecture.md`.
* Administration module: global configuration, feature flags, and system monitoring.

## External dependencies

These are needed to make the corresponding phase functional rather than mocked:

| Phase | Credential |
| ----- | ---------- |
| 2 | SMTP host, user, and password |
| 4 | `GEMINI_API_KEY`, optionally `SARVAM_API_KEY` |
| 5 | Razorpay key id, key secret, and webhook secret |
| 5–6 | Cloudinary or S3 credentials (local disk is used until then) |
