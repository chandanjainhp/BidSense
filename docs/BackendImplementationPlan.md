# BidSense Backend Server Architecture & Implementation Planner

This document provides a comprehensive backend implementation blueprint for the BidSense Request for Proposal (RFP) management platform. It has been reverse-engineered from the React 19 frontend codebase to serve as the definitive specification for building the backend.

---

## 1. Executive Summary

BidSense is an AI-powered procurement and RFP management platform designed to help enterprise managers draft RFPs, invite vendors, receive and compare proposals, and analyze bidding trends with AI assistance.

The frontend uses React 19, Tailwind CSS v4, and React Router v7. It has extensive interactive pages for dashboard statistics, vendor management, proposal comparisons, real-time AI chats, and document editors. Since the current codebase relies on mock data and client-side simulations, the backend server must replace these mocks with production-ready RESTful APIs, database persistence, transaction safety, and a secure AI integration layer.

This document details the architecture, services, database models, APIs, and security configurations required to build a highly scalable, secure, and performant backend server.

---

## 2. Technology Stack Analysis

The recommended backend technology stack balances high performance, structural integrity, and developer productivity:

- **Language**: **Python 3.11+** with type hints throughout, giving compile-time-style checking via mypy and runtime validation via Pydantic.
- **Web Framework**: **FastAPI** on Uvicorn for async route definition, dependency injection, and an OpenAPI schema generated directly from the code.
- **Primary Database**: **PostgreSQL** due to the relational nature of users, vendors, proposals, and RFPs, combined with native **JSONB** support for storing dynamic, unstructured RFP document sections and chat message history.
- **ORM**: **SQLAlchemy 2.0 (async)** with **Alembic** for versioned migrations and typed queries.
- **Caching & Queueing**: **Redis** for session management, rate limiting, and storing temporary AI context blocks.
- **AI Orchestration**: direct integration with the **Gemini API** via `google-generativeai` (wrapped in a provider interface) for drafting RFPs, generating compliance scoring, evaluating risk, and powering the conversational chat system.
- **File Processing**: **pypdf**, **python-docx**, and **openpyxl** for extraction; **reportlab** for generating PDF reports of proposals and RFP comparisons.

---

## 3. Project Structure Analysis

The client repository is structured as a standard single-page React application:

- `src/api/axios.js`: The central Axios instance configured with `VITE_API_URL` and a request interceptor that injects the JSON Web Token (`Authorization: Bearer <token>`) from `localStorage`.
- `src/services/`: Service layers abstracting API communication:
  - `authService.js`: Authentication hooks (login, signup, logout).
  - `rfpService.js`: RFP queries and creations.
  - `dashboardService.js`: KPI stats and activity feeds.
- `src/schemas/`: Form validation schemas using Zod:
  - `authSchema.js`: Schemas for logins and registration requirements.
  - `vendorSchema.js`: Schemas enforcing properties for vendors.
- `src/pages/`: 33 separate page views covering user workflows, public landing pages, resource libraries, and product documentations.
- `src/context/`:
  - `ThemeContext.jsx`: Theme controls (dark/light mode).
  - `ToastContext.jsx`: Ephemeral UI alerts.

---

## 4. Client Identification

The repository contains a **Single Frontend Application** target:

- **Client ID**: `bidsense-client-v1`
- **Entry Point**: `src/main.jsx`
- **Shared Services**: `src/api/axios.js` for unified network transport.
- **Client Configuration**: Uses environment variables (`VITE_API_URL`) to dynamically target staging, development, or production backends.

---

## 5. Architecture Overview

### Folder Responsibilities

The backend server will follow a clean, layered architectural pattern to isolate concerns:

```
server/app/
├── core/               # Settings, security, shared dependencies, exceptions
├── db/                 # Async engine, session factory, declarative base, seed
├── api/v1/             # FastAPI routers; parse parameters and return response models
├── models/             # SQLAlchemy ORM entities
├── schemas/            # Pydantic request validators and response models
├── repositories/       # Data access, one module per aggregate
├── services/           # Business logic, AI orchestration, mailers, PDF generation
├── providers/          # Gemini, Sarvam, Razorpay, storage, SMTP clients
├── workers/            # Celery tasks (parsing, embeddings, reports)
├── utils/              # Helper functions and formatters
└── main.py             # App entry point; wires middleware, routers, and lifespan
```

### State & Data Flow

The data flow follows a traditional unidirectional path:

1. **Client UI**: Initiates request (e.g., clicks "Draft Award Letter" or "Save RFP").
2. **Client Service Layer**: Calls `src/api/axios.js` to dispatch an HTTP request.
3. **CORS / Rate Limiters**: First gate of backend defense checking source and frequency.
4. **Auth Dependency**: Resolves the JWT, yields the current user, and verifies permissions.
5. **Request Validation**: FastAPI validates the payload against its Pydantic schema, returning HTTP 422 on mismatch.
6. **Router Layer**: Decouples network concerns and directs requests to services.
7. **Service Layer**: Houses core business logic, triggers third-party services (Gemini AI API, SMTP), and queries repositories.
8. **Database (ORM)**: Reads/writes state from PostgreSQL.
9. **Response Model**: Pydantic serializes the database entities back into the expected frontend JSON contract.

### Authentication Flow

1. **Registration**: Client sends full name, email, and password. Server hashes password, saves the user with status `PENDING`, and emails a 6-digit OTP.
2. **OTP Verification**: Client sends the OTP. The server marks the email as verified and updates user status to `ACTIVE`.
3. **Login**: Client sends email and password. Server verifies credentials, issues a JWT Access Token (short-lived) and a Refresh Token (stored in a secure, HTTP-only cookie).
4. **Token Refresh**: Accessing APIs with an expired token triggers an automatic call to the refresh endpoint to obtain a new Access Token.
5. **Logout**: Invalidates the refresh token on the server and deletes client-side tokens.

---

## 6. Component & Data Flow

Below is the conceptual architecture showing how client-side pages and components map to the backend service modules:

```mermaid
graph TD
    subgraph Client Pages
        A[Dashboard / Analytics]
        B[RFP Gallery / Editor]
        C[Proposal Inbox / Compare]
        D[Vendor Management]
        E[AI Chat Page]
    end

    subgraph Backend API Router
        Router[FastAPI APIRouter]
    end

    subgraph Routers
        AuthCtrl[Auth Router]
        RFPCtrl[RFP Router]
        PropCtrl[Proposal Router]
        VendCtrl[Vendor Router]
        ChatCtrl[Chat Router]
    end

    subgraph Services
        AISrv[Gemini AI Service]
        MailSrv[SMTP Mailer Service]
        PDFSrv[PDF Generation Service]
        DBSrv[SQLAlchemy / PostgreSQL]
    end

    A --> Router
    B --> Router
    C --> Router
    D --> Router
    E --> Router

    Router --> AuthCtrl
    Router --> RFPCtrl
    Router --> PropCtrl
    Router --> VendCtrl
    Router --> ChatCtrl

    RFPCtrl --> DBSrv
    RFPCtrl --> AISrv

    PropCtrl --> DBSrv
    PropCtrl --> PDFSrv

    VendCtrl --> DBSrv

    ChatCtrl --> AISrv
```

---

## 7. Dependency Analysis

The backend stack must integrate several key libraries to fulfill client contracts:

- **Pydantic v2**: Validates incoming bodies, mirroring the client's `authSchema` and `vendorSchema` rules.
- **passlib[bcrypt]**: Securely hashes and verifies user passwords.
- **python-jose**: Generates and verifies cryptographic signatures for access and refresh tokens.
- **pydantic-settings**: Manages configuration via environment files.
- **CORSMiddleware**: Configures specific Allowed Origins to protect resources.
- **structlog**: Structured JSON logging for HTTP requests and background jobs.
- **secure / custom middleware**: Sets HTTP headers to safeguard against cross-site scripting (XSS) and clickjacking.

---

## 8. API Specification

All routes return standard JSON responses. Endpoints are grouped logically below.

### 8.1 Authentication Modules

#### POST `/api/auth/register`

- **Purpose**: Register a new manager account.
- **Auth Requirement**: None.
- **Request Body**:
  ```json
  {
    "fullName": "John Doe",
    "email": "john.doe@company.com",
    "password": "SecurePassword123!"
  }
  ```
- **Validation Rules**: Matches `signupSchema`. Email must be unique; password must be >= 8 characters with at least one uppercase letter and one number.
- **Response (201 Created)**:
  ```json
  {
    "message": "Registration successful. Please verify your email with the OTP sent.",
    "email": "john.doe@company.com"
  }
  ```
- **Error States**: `400 Bad Request` (validation failed), `409 Conflict` (email already registered).

#### POST `/api/auth/verify-email`

- **Purpose**: Verify email and activate account during sign-up.
- **Auth Requirement**: None.
- **Request Body**:
  ```json
  {
    "email": "john.doe@company.com",
    "otp": "123456"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "jwt-access-token",
    "user": {
      "id": "usr_90210",
      "name": "John Doe",
      "email": "john.doe@company.com"
    }
  }
  ```
- **Error States**: `400 Bad Request` (invalid or expired OTP).

#### POST `/api/auth/login`

- **Purpose**: Login credentials check and token issuance.
- **Auth Requirement**: None.
- **Request Body**:
  ```json
  {
    "email": "john.doe@company.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "jwt-access-token",
    "user": {
      "id": "usr_90210",
      "name": "John Doe",
      "email": "john.doe@company.com"
    }
  }
  ```
- **Headers**: Sets a `Set-Cookie` header containing the refresh token (`HttpOnly`, `Secure`, `SameSite=Strict`).
- **Error States**: `401 Unauthorized` (incorrect credentials), `403 Forbidden` (email not verified).

#### POST `/api/auth/forgot-password`

- **Purpose**: Triggers a password reset OTP.
- **Auth Requirement**: None.
- **Request Body**: `{ "email": "john.doe@company.com" }`
- **Response (200 OK)**: `{ "message": "OTP sent! Check your inbox." }`

#### POST `/api/auth/verify-reset-otp`

- **Purpose**: Validates the password reset OTP before setting a new password.
- **Auth Requirement**: None.
- **Request Body**: `{ "email": "john.doe@company.com", "otp": "654321" }`
- **Response (200 OK)**: `{ "message": "OTP verified! Set your new password." }`

#### POST `/api/auth/reset-password`

- **Purpose**: Commits the new password.
- **Auth Requirement**: None.
- **Request Body**:
  ```json
  {
    "email": "john.doe@company.com",
    "otp": "654321",
    "password": "NewSecurePassword456!"
  }
  ```
- **Response (200 OK)**: `{ "message": "Password reset successful. You can now log in." }`

---

### 8.2 RFP Modules

#### GET `/api/rfps`

- **Purpose**: Retrieve all RFPs for the logged-in user's organization.
- **Auth Requirement**: Required (Bearer Token).
- **Query Parameters**:
  - `status`: Filter by status (`Draft`, `Active`, `Evaluation`, `Closed`).
  - `page`: Page index (default: `1`).
  - `limit`: Items per page (default: `10`).
- **Response (200 OK)**:
  ```json
  {
    "rfps": [
      {
        "id": "rfp_7788",
        "title": "Cloud Infrastructure Migration",
        "status": "Active",
        "deadline": "2026-03-15",
        "vendors": 12,
        "proposals": 8,
        "aiStatus": "Analysis Complete",
        "progress": 75
      }
    ],
    "pagination": { "currentPage": 1, "totalPages": 4, "totalItems": 36 }
  }
  ```

#### POST `/api/rfps`

- **Purpose**: Create a new blank RFP draft or initialize one.
- **Auth Requirement**: Required.
- **Request Body**:
  ```json
  {
    "title": "Enterprise Security Software",
    "deadline": "2026-04-01",
    "status": "Draft",
    "sections": [
      { "title": "Introduction", "content": "RFP introduction content..." }
    ]
  }
  ```
- **Response (201 Created)**: Returns the newly created RFP object, including server-assigned ID.

#### GET `/api/rfps/:id`

- **Purpose**: Fetch details of a single RFP including all draft document sections.
- **Auth Requirement**: Required.
- **Response (200 OK)**:
  ```json
  {
    "id": "rfp_7788",
    "title": "Cloud Infrastructure Migration",
    "status": "Draft",
    "deadline": "2026-03-15",
    "sections": [
      { "id": "sec_1", "title": "Introduction", "content": "Details..." },
      { "id": "sec_2", "title": "Scope of Work", "content": "Details..." }
    ]
  }
  ```

#### PUT `/api/rfps/:id`

- **Purpose**: Save section edits and update metadata (title, deadline, status).
- **Auth Requirement**: Required.
- **Request Body**:
  ```json
  {
    "title": "Updated Cloud Migration",
    "deadline": "2026-03-24",
    "status": "Active",
    "sections": [
      { "id": "sec_1", "title": "Introduction", "content": "Modified text..." }
    ]
  }
  ```
- **Response (200 OK)**: `{ "success": true, "message": "Draft saved successfully" }`

#### POST `/api/rfps/:id/ai-analyze`

- **Purpose**: Run AI checks on dynamic sections (e.g. eligibility and scoping criteria).
- **Auth Requirement**: Required.
- **Request Body**: `{ "action": "Eligibility Criteria" }`
- **Response (200 OK)**:
  ```json
  {
    "insight": "Based on similar industry benchmarks, your 'Eligibility Criteria' is slightly restrictive. Consider softening the experience requirement to 7 years to increase vendor participation."
  }
  ```

#### POST `/api/rfps/:id/send`

- **Purpose**: Dispatch invitations to selected vendors.
- **Auth Requirement**: Required.
- **Request Body**:
  ```json
  {
    "vendorIds": ["vend_1", "vend_2"],
    "message": {
      "subject": "Invitation to Bid: Cloud Migration",
      "body": "We invite your firm to submit a proposal..."
    }
  }
  ```
- **Response (200 OK)**: `{ "message": "Invitations sent to 2 selected vendors." }`

#### GET `/api/rfps/:id/analytics`

- **Purpose**: Returns analytical KPIs, funnel statistics, and event timelines.
- **Auth Requirement**: Required.
- **Response (200 OK)**:
  ```json
  {
    "totalBids": 12,
    "avgBidAmount": "$75,400",
    "lowestBid": "$68,000",
    "highestBid": "$92,500",
    "vendorsInvited": 24,
    "vendorsViewed": 18,
    "vendorsBidding": 12,
    "bidSpread": [
      { "range": "$60k - $70k", "count": 2 },
      { "range": "$70k - $80k", "count": 6 }
    ],
    "timeline": [
      { "date": "Jan 10", "event": "RFP Published", "type": "success" }
    ]
  }
  ```

---

### 8.3 Vendor Modules

#### GET `/api/vendors`

- **Purpose**: List vendors with search, sorting, and status filter hooks.
- **Auth Requirement**: Required.
- **Query Parameters**:
  - `search`: Matches company name or industry.
  - `status`: Filters by `Active`, `Pending`, `Inactive`.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "vend_1",
      "name": "CloudNet Solutions",
      "industry": "IT Infrastructure",
      "contact": "sarah@cloudnet.com",
      "score": 92,
      "status": "Active",
      "projects": 4
    }
  ]
  ```

#### POST `/api/vendors`

- **Purpose**: Add a new vendor.
- **Auth Requirement**: Required.
- **Request Body**: Enforces structure defined in `vendorSchema` (name, industry, website, contactName, email, phone, status, notes).
- **Response (201 Created)**: Returns the newly added vendor object.

---

### 8.4 Proposal Modules

#### GET `/api/proposals`

- **Purpose**: Retrieve submitted proposals.
- **Auth Requirement**: Required.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "prop_99",
      "vendor": "TechFlow Systems",
      "rfp": "Cloud Migration 2026",
      "date": "2026-01-12",
      "status": "Scored",
      "score": 94,
      "amount": "$120,000",
      "aiInsight": "Highest technical alignment"
    }
  ]
  ```

#### GET `/api/proposals/:id/review`

- **Purpose**: Fetch slide-over details for a specific proposal.
- **Auth Requirement**: Required.
- **Response (200 OK)**:
  ```json
  {
    "id": "prop_99",
    "vendor": "TechFlow Systems",
    "rfp": "Cloud Migration 2026",
    "score": 94,
    "amount": "$120,000",
    "summary": "Based on our extensive experience...",
    "financials": [
      { "item": "Initial Discovery", "cost": "$15,000" },
      { "item": "Migration Execution", "cost": "$85,000" }
    ],
    "aiInsights": [
      {
        "type": "positive",
        "title": "Strong Technical Alignment",
        "desc": "94% requirement match."
      }
    ]
  }
  ```

#### POST `/api/proposals/:id/shortlist`

- **Purpose**: Shortlist a vendor proposal.
- **Auth Requirement**: Required.
- **Response (200 OK)**: `{ "status": "Shortlisted" }`

#### GET `/api/proposals/:id/download-pdf`

- **Purpose**: Stream a dynamically compiled PDF summary of the proposal.
- **Auth Requirement**: Required.
- **Response**: Binary PDF application data.

#### GET `/api/proposals/compare`

- **Purpose**: Fetch comparison data for proposals under a specific RFP.
- **Auth Requirement**: Required.
- **Query Parameters**:
  - `rfpId`: The ID of the RFP to compare.
- **Response (200 OK)**:
  ```json
  {
    "vendors": [
      {
        "id": "v1",
        "name": "Acme Corp",
        "score": 92,
        "cost": "$125,000",
        "timeline": "3 Months",
        "compliance": "100%",
        "risk": "Low",
        "isWinner": true
      }
    ],
    "aiRecommendation": "Acme Corp emerges as the optimal choice due to its low risk profile..."
  }
  ```

---

### 8.5 Chat Modules

#### GET `/api/chats`

- **Purpose**: Fetch all chat threads for the logged-in user.
- **Auth Requirement**: Required.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "chat_1",
      "title": "Cloud Infrastructure Migration",
      "time": "2026-07-13T12:00:00Z"
    }
  ]
  ```

#### GET `/api/chats/:id/messages`

- **Purpose**: Retrieve the message history for a specific thread.
- **Auth Requirement**: Required.
- **Response (200 OK)**:
  ```json
  [
    { "id": "msg_1", "role": "ai", "content": "Hello!", "time": "10:00 AM" },
    {
      "id": "msg_2",
      "role": "user",
      "content": "Analyze RFP...",
      "time": "10:02 AM"
    }
  ]
  ```

#### POST `/api/chats`

- **Purpose**: Initialize a new chat thread.
- **Auth Requirement**: Required.
- **Response (201 Created)**: Returns the new chat thread header object.

#### POST `/api/chats/:id/messages`

- **Purpose**: Post a message to the AI Assistant and receive a processed response.
- **Auth Requirement**: Required.
- **Request Body**: `{ "content": "Can you check security scope?" }`
- **Response (200 OK)**:
  ```json
  {
    "userMessage": {
      "id": "msg_new_user",
      "role": "user",
      "content": "Can you check...",
      "time": "12:05 PM"
    },
    "aiResponse": {
      "id": "msg_new_ai",
      "role": "ai",
      "content": "Analyzed! Zero-trust configurations look complete.",
      "time": "12:05 PM"
    }
  }
  ```

#### POST `/api/chats/:id/clear`

- **Purpose**: Resets the AI context for the active thread.
- **Auth Requirement**: Required.
- **Response (200 OK)**: `{ "message": "Context cleared" }`

#### DELETE `/api/chats/:id`

- **Purpose**: Remove a conversation thread.
- **Auth Requirement**: Required.
- **Response (200 OK)**: `{ "success": true }`

---

### 8.6 Dashboard & Activity Modules

#### GET `/api/dashboard/stats`

- **Purpose**: Returns the KPI statistics cards.
- **Auth Requirement**: Required.
- **Response (200 OK)**:
  ```json
  [
    {
      "label": "Total RFPs",
      "value": "24",
      "color": "text-blue-600",
      "bg": "bg-blue-50",
      "link": "/rfps"
    },
    {
      "label": "Active Vendors",
      "value": "142",
      "color": "text-indigo-600",
      "bg": "bg-indigo-50",
      "link": "/vendors"
    }
  ]
  ```

#### GET `/api/dashboard/activity`

- **Purpose**: Retrieve audit/activity feed logs.
- **Auth Requirement**: Required.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "act_1",
      "user": "Sarah Connor",
      "action": "published a new RFP",
      "target": "Cloud Migration Project",
      "time": "2 hours ago"
    }
  ]
  ```

#### GET `/api/notifications`

- **Purpose**: Retrieve notification center list.
- **Auth Requirement**: Required.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "not_1",
      "type": "ai",
      "title": "AI Scoring Complete",
      "message": "Scored 12 proposals.",
      "time": "2 mins ago",
      "isRead": false
    }
  ]
  ```

#### PUT `/api/notifications/read`

- **Purpose**: Mark all user notifications as read.
- **Auth Requirement**: Required.
- **Response (200 OK)**: `{ "success": true }`

---

## 9. Database Design

We recommend a relational schema in **PostgreSQL** due to strong structural relations, constraint enforcement, and query performance. To support dynamic structures like dynamic RFP sections and message threads, PostgreSQL's native `JSONB` fields will be utilized.

### Entity Relationship Diagram (ERD Schema)

```
[Users]
  - id (PK)
  - email (UQ, Indexed)
  - password_hash
  - full_name
  - role
  - status (enum: PENDING, ACTIVE)
  - timezone
  - avatar_url
  - created_at
  - updated_at
      │
      ├── 1:N ──> [Rfps]
      │             - id (PK)
      │             - user_id (FK)
      │             - title
      │             - status (enum: Draft, Active, Evaluation, Closed)
      │             - deadline
      │             - sections (JSONB) -- e.g. [{"id": "1", "title": "Scope", "content": "..."}]
      │             - progress (int)
      │             - created_at
      │             - updated_at
      │                 │
      │                 ├── 1:N ──> [Proposals]
      │                 │             - id (PK)
      │                 │             - rfp_id (FK)
      │                 │             - vendor_id (FK)
      │                 │             - amount (decimal)
      │                 │             - status (enum: Pending, Under_Review, Scored)
      │                 │             - score (int, nullable)
      │                 │             - ai_insight (text)
      │                 │             - financials (JSONB)
      │                 │             - submitted_at
      │
      ├── 1:N ──> [Chats]
      │             - id (PK)
      │             - user_id (FK)
      │             - title
      │             - messages (JSONB) -- e.g. [{"role": "ai", "content": "...", "time": "..."}]
      │             - updated_at
      │
      └── 1:N ──> [Notifications]
                    - id (PK)
                    - user_id (FK)
                    - type (enum: ai, rfp, vendor, system)
                    - title
                    - message
                    - is_read (boolean)
                    - created_at

[Vendors]
  - id (PK)
  - name
  - industry
  - website
  - contact_name
  - email (UQ)
  - phone
  - status (enum: Pending, Active, Inactive)
  - score (int)
  - notes (text, nullable)
  - created_at
  - updated_at
      │
      └── 1:N ──> [Proposals]
```

### Key Database Design Principles

- **Soft Delete Strategy**: Instead of deleting record rows (e.g. vendors or RFPs), a `deleted_at` timestamp is updated. Queries automatically filter out rows where `deleted_at IS NOT NULL`.
- **Database Indexes**:
  - Index on `users(email)` for sub-millisecond login resolution.
  - Index on `rfps(user_id, status)` for fast gallery renders.
  - Index on `proposals(rfp_id)` for quick comparison resolutions.
  - GIN index on JSONB fields (`rfps(sections)` and `chats(messages)`) if complex nested text querying is introduced.
- **Audit Fields**: Every table features `created_at` and `updated_at` timestamps to log data lifecycle transactions.

---

## 10. Backend Folder Structure

We recommend the following layout using clean architecture principles:

```
src/
├── config/
│   ├── database.ts           # Prisma connection client pool
│   ├── redis.ts              # Redis client connection
│   └── environment.ts        # Typed and checked env variables
├── controllers/
│   ├── auth.controller.ts    # Parses login/register inputs
│   ├── rfp.controller.ts     # CRUD for RFPs and analysis trigger
│   ├── vendor.controller.ts  # Add vendor and fetch directories
│   ├── proposal.controller.ts# Fetch inbox and generate PDF outputs
│   └── chat.controller.ts    # Send prompts and retrieve conversations
├── middleware/
│   ├── auth.middleware.ts    # Inspects JWT signature and checks req.user
│   ├── error.middleware.ts   # Central handler converting errors to JSON
│   ├── rateLimiter.ts        # Restricts high-volume bot attempts
│   └── validate.ts           # Schema validation middleware helper
├── models/
│   └── schema.prisma         # Prisma single-source relational database structure
├── routes/
│   ├── auth.routes.ts        # Maps authentication API endpoints
│   ├── rfp.routes.ts         # Maps RFP endpoints
│   ├── vendor.routes.ts      # Maps vendor actions
│   ├── proposal.routes.ts    # Maps proposal inbox and comparisons
│   └── chat.routes.ts        # Maps conversational chatbot actions
├── services/
│   ├── ai.service.ts         # Orchestrates Gemini API prompts
│   ├── mail.service.ts       # Integrates NodeMailer SMTP actions
│   ├── pdf.service.ts        # Compiles proposal details into formatted PDFs
│   └── token.service.ts      # Signs, decodes, and refreshes JWT keys
├── validators/
│   ├── auth.validator.ts     # Zod login and register body validation rules
│   └── vendor.validator.ts   # Zod vendor details validation rules
└── index.ts                  # Starts Express app server
```

---

## 11. Authentication & Authorization

- **JWT Strategy**:
  - **Access Token**: Short-lived (15 minutes). Sent in the `Authorization` header as a Bearer token. Contains `userId`, `role`, and `organizationId`.
  - **Refresh Token**: Long-lived (7 days). Stored in a secure, HTTP-only cookie to mitigate XSS exposure. Tied to a session entry in Redis/PostgreSQL for token rotation and security invalidation.
- **MFA & Sign-Up OTPs**:
  - High-security verification triggers email notifications during signups and password recovery. OTPs are stored in Redis with a 5-minute expiration window.
- **Role-Based Access Control (RBAC)**:
  - Backend enforces roles: `Admin` (full operations, vendor approval), `Procurement Manager` (RFP drafting, proposal evaluation), and `Viewer` (read-only permission on dashboard analytics).

---

## 12. Middleware

- **CORS**: Enforces approved origins (`CLIENT_URL`) to prevent unauthorized cross-origin requests.
- **Helmet**: Configures HTTP headers to protect against framing, clickjacking, and XSS injection vectors.
- **Rate Limiting**: Enforced via Redis to block brute-force attempts on sensitive endpoints:
  - Authentication endpoints: Max 5 attempts per 15 minutes per IP.
  - AI analysis & Chat: Max 30 prompts per minute to prevent heavy processing overhead.
  - General APIs: Max 100 requests per minute.
- **Auth Middleware**: Decodes access token and attaches user information to `req.user`.
- **Validation Middleware**: Uses Zod to parse request bodies, parameters, and queries. Returns a structured list of errors if validation fails.
- **Central Error Middleware**: Catches all unhandled exceptions, logs them with stack traces (excluding production), and formats a standard JSON response.

---

## 13. Validation Strategy

Validation is strictly enforced using **Zod** schema definitions:

- **Request Body**: Validates forms such as user registration (`authSchema.js`) and vendor profiles (`vendorSchema.js`).
- **Query Parameters**: Validates pagination variables (`page`, `limit` must be positive integers) and filters (`status` must match defined status enums).
- **Path Parameters**: Validates ID parameters (e.g. `id` must follow UUID or standard alphanumeric patterns).

---

## 14. Error Handling

The backend returns a unified error response contract to the frontend.

### Standard JSON Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request payload failed validation checks.",
    "details": [
      {
        "field": "email",
        "issue": "Invalid email address"
      }
    ]
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Invalid or expired JWT token.
- `FORBIDDEN`: User lacks sufficient RBAC privileges.
- `NOT_FOUND`: Resource (RFP, Vendor, Proposal) does not exist.
- `VALIDATION_FAILED`: Payload properties failed validation.
- `INTERNAL_SERVER_ERROR`: Unhandled system error.

---

## 15. Backend Services

### AI Service

- Communicates with the **Gemini API**.
- **RFP Scrutiny**: Feeds RFP text and asks for compliance inconsistencies, strict eligibility criteria, and risk flags.
- **Proposal Scoring**: Validates proposal files against RFP requirements, returning a score (0-100) and structured insights.
- **Chat Context**: Handles conversational chat contexts and stores message history in the database.

### Mail Service

- Uses `fastapi-mail` over SMTP to send transactional notifications.
- Dispatches email invitations to vendors with link references.
- Sends sign-up and password reset OTPs.

### PDF Service

- Generates on-the-fly comparisons and proposal evaluations using `reportlab`.
- Returns a `StreamingResponse` from the router to allow file downloads in the browser.

---

## 16. Configuration

The server requires a `.env` file containing the following variables:

| Variable             | Example Value                                    | Description                                          |
| :------------------- | :----------------------------------------------- | :--------------------------------------------------- |
| `PORT`               | `8000`                                           | The local port Uvicorn listens on.                   |
| `DATABASE_URL`       | `postgresql://user:pass@localhost:5432/bidsense` | PostgreSQL connection string.                        |
| `REDIS_URL`          | `redis://localhost:6379`                         | Redis connection for rate limits/session management. |
| `SECRET_KEY`         | `super-secret-access-key`                        | HMAC key to sign access tokens.                      |
| `REFRESH_SECRET_KEY` | `super-secret-refresh-key`                       | HMAC key to sign refresh tokens.                     |
| `GEMINI_API_KEY`     | `AIzaSy...`                                      | API credential for Gemini AI access.                 |
| `SMTP_HOST`          | `smtp.mailtrap.io`                               | SMTP service host name.                              |
| `SMTP_PORT`          | `2525`                                           | Port for outgoing emails.                            |
| `SMTP_USER`          | `smtp_username`                                  | SMTP credential username.                            |
| `SMTP_PASSWORD`      | `smtp_password`                                  | SMTP credential password.                            |
| `CORS_ORIGINS`       | `http://localhost:5173`                          | Allowed frontend origins for CORS.                   |
| `QDRANT_URL`         | `http://localhost:6333`                          | Vector database endpoint for RAG.                    |
| `RAZORPAY_KEY_ID`    | `rzp_test_...`                                   | Razorpay API key id.                                 |
| `RAZORPAY_KEY_SECRET`| `...`                                            | Razorpay API secret.                                 |

---

## 17. Security Review

We recommend implementing the following security measures on the backend:

- **SQL Injection Prevention**: SQLAlchemy binds all query parameters, so no user input is interpolated into SQL.
- **Password Security**: Passwords must be hashed using `bcrypt` (12 rounds) before storage.
- **CSRF Mitigation**: Storing the JWT access token in memory and the refresh token in an `HttpOnly` cookie with `SameSite=Strict` shields the application from CSRF vectors.
- **Sensitive Data Exposure**: SQL select targets will omit password hashes and active session tokens by default.

---

## 18. Performance & Scalability

- **Pagination**: Enforced on all listing endpoints (RFPs, vendors, and proposals) to limit payload sizes and database load.
- **Database Indexing**: Applying indexes on foreign keys (`rfp_id`, `user_id`) ensures fast lookup queries.
- **Redis Caching**:
  - Caches static lists (e.g. system configurations, active industries).
  - Caches dashboard metrics (`/dashboard/stats`) with a 5-minute cache TTL.
- **Rate Limiting**: Enforced on authentication and AI routes to prevent server overload and manage resource consumption.

---

## 19. Testing Strategy

- **Unit Tests**: Focus on utility functions, validators, and service classes (e.g. validating token parsing).
- **Integration Tests**: Tests database read/write queries and transaction lifecycles.
- **API Tests**: Uses `httpx.AsyncClient` against the ASGI app to verify routes, status codes, and JSON response formats.
- **Security & Auth Tests**: Asserts that protected routes block invalid tokens and restrict access based on user roles.

---

## 20. Deployment Plan

- **Dockerized Setup**: Package the Python runtime using a multi-stage Docker build (slim base image, wheels built in the first stage) for minimal image sizes.
- **Docker Compose**: Simplifies local development orchestration by running the app container alongside PostgreSQL, Redis, and Qdrant.
- **Reverse Proxy**: Use Nginx or Caddy to terminate SSL certificates, compress assets (gzip), and forward requests to the app.
- **Health Checks**: The server will expose a `/health` endpoint to monitor database connectivity and server status.

---

## 21. Implementation Roadmap

```mermaid
gantt
    title BidSense Backend Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Setup & DB
    Project Setup & Configurations :active, 2026-07-15, 3d
    Database Migrations & Schemas   :active, 2026-07-18, 4d
    section Phase 2: Core Logic
    Authentication & Authorization  : 2026-07-22, 5d
    RFP Drafting & Vendor CRUD     : 2026-07-27, 6d
    section Phase 3: Advanced
    AI Integrations & Chat        : 2026-08-02, 7d
    PDF Generators & Mailers       : 2026-08-09, 5d
    section Phase 4: Production
    Hardening, Testing & Deploy    : 2026-08-14, 6d
```

### Complexity Metrics

- **Phase 1 — Setup & Database**: **Low Complexity**. Standard schema migrations.
- **Phase 2 — Auth & Core Logic**: **Medium Complexity**. Multi-step OTP flows and JWT session management.
- **Phase 3 — AI & Documents**: **High Complexity**. Optimizing context windows for AI prompts and parsing complex files.
- **Phase 4 — Deploy & Tests**: **Medium Complexity**. Setting up production environments and orchestrating CI/CD pipelines.

---

## 22. Assumptions & Missing Information

- **Authentication Boundaries**: The application implies a multi-tenant corporate environment. We assume that users are grouped under an `Organization` and can view all RFPs and vendors belonging to that organization.
- **AI Provider Limits**: The client does not define AI rate limits or fallback providers. We assume the system will use the Gemini API and handle token usage and throttling limits on the backend.
- **File Uploads**: The frontend displays proposal statistics but lacks file input fields for uploading PDF proposals. We assume that in a production setup, proposals will be submitted via a file upload endpoint using a cloud storage bucket (e.g. AWS S3 or Google Cloud Storage).
