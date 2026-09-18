# 12. API Architecture & Standards

## 12.1 Overview

The BidSense backend exposes a RESTful API designed around predictable resource-oriented endpoints, consistent request and response formats, strong validation, and versioning.

The API is intended to serve:

* React Web Application
* Future Mobile Applications
* Third-Party Integrations
* AI Services
* Internal Background Workers

The API follows REST principles while remaining flexible enough to support future GraphQL or gRPC integrations if required.

---

# 12.2 API Design Principles

The API follows these principles:

* RESTful Design
* Resource-Oriented URLs
* Stateless Requests
* Predictable Responses
* Versioned Endpoints
* Consistent Error Handling
* Secure by Default
* Idempotent Operations
* Pagination Support
* Filtering & Sorting
* OpenAPI Documentation

---

# 12.3 API Versioning

All endpoints are versioned.

```text
/api/v1/
```

Example

```text
/api/v1/auth/login

/api/v1/vendors

/api/v1/rfps

/api/v1/proposals
```

Future versions

```text
/api/v2/

/api/v3/
```

Older versions remain supported during migration periods.

---

# 12.4 API Base URL

Development

```text
http://localhost:5000/api/v1
```

Production

```text
https://api.bidsense.com/api/v1
```

---

# 12.5 Resource Naming

Use plural nouns.

Correct

```text
/users

/vendors

/rfps

/proposals

/payments
```

Avoid

```text
/getUsers

/createVendor

/deleteProposal
```

Operations should be represented using HTTP methods, not verbs in the URL.

---

# 12.6 HTTP Methods

| Method | Purpose           |
| ------ | ----------------- |
| GET    | Retrieve Resource |
| POST   | Create Resource   |
| PUT    | Replace Resource  |
| PATCH  | Partial Update    |
| DELETE | Soft Delete       |

Examples

```http
GET /vendors

POST /vendors

PATCH /vendors/:id

DELETE /vendors/:id
```

---

# 12.7 Standard Response Format

Every successful response follows the same structure.

```json
{
  "success": true,
  "message": "Vendor created successfully.",
  "data": {},
  "meta": {}
}
```

---

# 12.8 Error Response Format

Every error response follows a consistent structure.

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "email",
      "message": "Email is required."
    }
  ]
}
```

---

# 12.9 HTTP Status Codes

| Code | Meaning               |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 204  | No Content            |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 422  | Validation Error      |
| 429  | Too Many Requests     |
| 500  | Internal Server Error |

---

# 12.10 Authentication

Protected endpoints require an Access Token.

Header

```http
Authorization: Bearer <access_token>
```

Refresh Tokens are transmitted using secure HttpOnly cookies.

---

# 12.11 Request Validation

Every request is validated before reaching the controller.

Validation covers

* Request Body
* URL Parameters
* Query Parameters
* File Uploads
* Headers

Validation is implemented using Zod.

---

# 12.12 Pagination

Large datasets use pagination.

Example

```http
GET /vendors?page=1&limit=20
```

Response

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 152,
    "totalPages": 8
  }
}
```

---

# 12.13 Filtering

Example

```http
GET /vendors?status=active
```

Multiple filters

```http
GET /vendors?category=software&country=india
```

---

# 12.14 Sorting

Ascending

```http
GET /vendors?sort=name
```

Descending

```http
GET /vendors?sort=-created_at
```

Multiple fields

```http
GET /vendors?sort=-created_at,name
```

---

# 12.15 Searching

Example

```http
GET /vendors?search=cloud
```

Supports

* Vendor Name
* RFP Title
* Proposal Title
* Organization Name

Future enhancement

* AI Semantic Search

---

# 12.16 File Upload API

Uploads use multipart/form-data.

Example

```http
POST /uploads/proposals
```

Supported types

* PDF
* DOCX
* XLSX
* CSV
* Images

---

# 12.17 Idempotency

Operations such as payment verification and webhook processing must be idempotent.

Example

```http
POST /payments/webhook
```

Duplicate webhook deliveries should not create duplicate records or trigger repeated business actions.

---

# 12.18 API Rate Limiting

Limits

| Endpoint    | Limit           |
| ----------- | --------------- |
| Login       | 5/minute/IP     |
| Register    | 5/minute/IP     |
| OTP         | 3/minute        |
| AI Chat     | Plan-based      |
| File Upload | Plan-based      |
| General API | 100/minute/User |

Redis stores rate limit counters.

---

# 12.19 API Security

Security measures include

* JWT Authentication
* RBAC Authorization
* CORS
* Helmet
* Rate Limiting
* Input Validation
* SQL Injection Protection
* XSS Protection
* Request Logging
* Audit Logging

---

# 12.20 API Documentation

All endpoints are documented using OpenAPI 3.

Documentation includes

* Endpoint Description
* Parameters
* Request Body
* Responses
* Authentication
* Error Codes
* Example Requests
* Example Responses

Swagger UI is available during development.

---

# 12.21 API Request Lifecycle

```mermaid
sequenceDiagram

Client->>Route

Route->>Authentication Middleware

Authentication Middleware->>Authorization Middleware

Authorization Middleware->>Validation Middleware

Validation Middleware->>Controller

Controller->>Service

Service->>Repository

Repository->>Database

Database-->>Repository

Repository-->>Service

Service-->>Controller

Controller-->>Client
```

---

# 12.22 Module Endpoints

Major API modules

```text
/api/v1/auth

/api/v1/users

/api/v1/organizations

/api/v1/vendors

/api/v1/rfps

/api/v1/proposals

/api/v1/ai

/api/v1/chats

/api/v1/notifications

/api/v1/payments

/api/v1/subscriptions

/api/v1/invoices

/api/v1/uploads

/api/v1/dashboard
```

---

# 12.23 API Conventions

General rules

* Use plural resource names.
* Use kebab-case for URL segments.
* Return JSON responses.
* Never expose internal database identifiers beyond UUIDs.
* Do not leak stack traces.
* Include pagination metadata where applicable.
* Use UTC timestamps in ISO 8601 format.
* Maintain backward compatibility within the same API version.

---

# 12.24 OpenAPI Standards

The API specification includes

* Schemas
* Components
* Security Schemes
* Tags
* Examples
* Reusable Responses
* Request Bodies

This specification serves as the contract between frontend and backend.

---

# 12.25 Summary

The BidSense API is designed as a secure, versioned, RESTful interface with consistent conventions for resources, responses, validation, pagination, filtering, and error handling. A standardized API contract simplifies frontend integration, third-party development, automated testing, and long-term maintenance while supporting future platform growth.
a