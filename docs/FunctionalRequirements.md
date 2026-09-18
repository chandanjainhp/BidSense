# 2. Functional Requirements

## 2.1 Overview

This section defines the functional capabilities of the BidSense platform. Each requirement represents a business feature that the system must support.

The application is organized into independent modules that communicate through secure REST APIs while sharing a centralized authentication and authorization system.

---

# 2.2 Authentication Module

## Features

* User Registration
* Email Verification (OTP)
* Secure Login
* Refresh Token Authentication
* Logout
* Forgot Password
* Password Reset
* Change Password
* User Profile
* Session Management

### Functional Requirements

* Users can create a new account.
* Email addresses must be unique.
* Passwords must be securely hashed.
* Email verification is mandatory before login.
* JWT Access Tokens must authenticate API requests.
* Refresh Tokens must renew expired sessions.
* Users can log out from one or all devices.
* Password reset must use OTP verification.
* Authentication events must be logged.

---

# 2.3 Organization Module

## Features

* Create Organization
* Organization Profile
* Organization Settings
* Invite Team Members
* Organization Branding

### Functional Requirements

* A user can own multiple organizations.
* Organizations can have multiple users.
* Users belong to one organization at a time.
* Organization settings affect all members.
* Subscription plans are organization-specific.

---

# 2.4 User Management

## Features

* User Profile
* Team Members
* User Status
* User Roles
* Permissions

### Functional Requirements

* Admins can invite users.
* Admins can suspend users.
* Admins can assign roles.
* Users can update their own profile.
* Profile pictures can be uploaded.

---

# 2.5 Role-Based Access Control (RBAC)

## Roles

* Super Admin
* Organization Admin
* Procurement Manager
* Procurement Officer
* Vendor
* Viewer

### Functional Requirements

* Every API validates permissions.
* Roles determine allowed operations.
* Permissions can be extended.
* Unauthorized requests return HTTP 403.

---

# 2.6 Vendor Management

## Features

* Vendor Registration
* Vendor Categories
* Vendor Performance
* Vendor Contacts
* Vendor Documents
* Vendor Rating

### Functional Requirements

* Create vendors.
* Edit vendor information.
* Archive vendors.
* Search vendors.
* Filter vendors.
* Upload vendor documents.
* Track vendor performance.
* Associate vendors with RFPs.

---

# 2.7 RFP Management

## Features

* Draft RFP
* AI RFP Generation
* Publish RFP
* Edit Draft
* Archive
* Duplicate RFP
* Version History

### Functional Requirements

* Users can create unlimited drafts (plan permitting).
* AI can generate complete RFP documents.
* Rich text editing is supported.
* Deadlines are configurable.
* Vendors receive invitations.
* RFP status is tracked.
* Version history is maintained.

---

# 2.8 Proposal Management

## Features

* Proposal Submission
* Proposal Upload
* Proposal Review
* Proposal Comparison
* Proposal Scoring
* Proposal Approval

### Functional Requirements

* Vendors upload proposal documents.
* Multiple file formats are supported.
* AI evaluates proposals.
* Procurement managers compare proposals.
* Shortlisted proposals are tracked.
* Winning proposals are recorded.

---

# 2.9 AI Module

## Features

* AI Chat
* AI RFP Generation
* Proposal Analysis
* Vendor Recommendation
* Compliance Analysis
* Executive Summary
* Risk Detection

### Functional Requirements

* AI generates procurement content.
* AI answers procurement questions.
* AI compares proposals.
* AI detects missing requirements.
* AI recommends vendors.
* AI summarizes documents.
* AI provides citations where applicable.

---

# 2.10 RAG (Retrieval-Augmented Generation)

## Features

* Document Indexing
* Semantic Search
* Embeddings
* Vector Search
* Context Retrieval
* AI Memory

### Functional Requirements

* Uploaded documents are parsed.
* Documents are chunked.
* Embeddings are generated.
* Vectors are indexed.
* Relevant context is retrieved.
* AI responses use retrieved context.

---

# 2.11 Document Management

## Features

* File Upload
* Document Storage
* Metadata
* Preview
* Download
* Version Control

### Functional Requirements

* Support PDF, DOCX, XLSX, CSV, TXT, and images.
* Store metadata.
* Maintain document history.
* Associate documents with entities.

---

# 2.12 Dashboard

## Features

* KPIs
* Charts
* Procurement Analytics
* Vendor Analytics
* Proposal Analytics
* Activity Feed

### Functional Requirements

* Dashboard updates in near real time.
* Charts support filtering.
* KPIs aggregate organizational data.

---

# 2.13 Notification Module

## Features

* In-App Notifications
* Email Notifications
* System Alerts

### Functional Requirements

* Notify users of important events.
* Mark notifications as read.
* Support notification preferences.

---

# 2.14 Payment Module

## Features

* Razorpay Integration
* Subscription Plans
* Payment History
* Invoice Generation
* Webhook Processing

### Functional Requirements

* Organizations subscribe to plans.
* Payments are verified.
* Subscription status is updated.
* Invoices are generated.
* Failed payments are recorded.
* Webhooks update payment state securely.

---

# 2.15 Reporting

## Features

* Procurement Reports
* Vendor Reports
* Proposal Reports
* Financial Reports

### Functional Requirements

* Export reports as PDF.
* Export reports as Excel.
* Schedule report generation.

---

# 2.16 Audit Logging

## Features

* Login History
* User Activity
* Data Changes
* Security Events

### Functional Requirements

* Record all critical actions.
* Logs are immutable.
* Logs are searchable.

---

# 2.17 Administration

## Features

* System Configuration
* Feature Flags
* User Management
* Monitoring
* Maintenance

### Functional Requirements

* Administrators configure the platform.
* Manage global settings.
* Monitor system health.
* Enable or disable platform features.

---

# 2.18 External Integrations

The system supports integration with:

* Gemini AI
* Sarvam AI
* Razorpay
* Redis
* PostgreSQL
* Qdrant
* Cloudinary
* SMTP Email Service

Future integrations include ERP systems, CRMs, and government procurement platforms.

---

# 2.19 Functional Requirement Summary

This table tracks **implementation status**, not intent. Every module above is in scope; the status column records what exists in `server/` and `client/` today.

Legend: ✓ implemented · ◐ partial · ✗ not started

| Module         | Status | Notes                                                                             | Phase |
| -------------- | ------ | --------------------------------------------------------------------------------- | ----- |
| Authentication | ◐      | Register, OTP verification, login, refresh, password reset. Refresh tokens are not persisted and logout is a no-op. | 2 |
| Organization   | ✗      | No organization entity; records are owned by a single user.                       | 2     |
| Users          | ◐      | Profile and user settings only; no team membership or suspension.                 | 2     |
| RBAC           | ✗      | No roles or permissions; every authenticated user has the same access.            | 2     |
| Vendors        | ◐      | CRUD and listing. No categories, documents, ratings, or archiving.                | 3     |
| RFPs           | ◐      | CRUD, status, vendor invitations (tokens generated, emails not sent). No sections, versions, or duplication. | 3 |
| Proposals      | ◐      | Submission and status transitions. No file uploads, comparison, or award flow.    | 3     |
| AI             | ◐      | Chat and proposal scoring through an OpenAI-compatible endpoint with an offline fallback; Gemini and Sarvam are not wired up. | 4 |
| RAG            | ✗      | No Qdrant, chunking, embeddings, or citations.                                    | 4     |
| Documents      | ✗      | Avatar upload only; no document entity, parsing, or preview.                      | 4     |
| Dashboard      | ◐      | Aggregate endpoints exist; the client still renders some mock data.               | 6     |
| Notifications  | ◐      | In-app notifications only; no email delivery or preferences.                      | 2     |
| Payments       | ✗      | No Razorpay integration, plans, subscriptions, or invoices.                       | 5     |
| Reports        | ✗      | No report generation or PDF/Excel export.                                         | 5     |
| Audit Logs     | ◐      | An `activities` table records some events; not immutable, searchable, or complete. | 2    |
| Administration | ✗      | No global configuration, feature flags, or system monitoring.                     | 7     |
| Integrations   | ◐      | PostgreSQL and Redis only. Gemini, Sarvam, Qdrant, Razorpay, Cloudinary, and SMTP are configured but unused. | 4–5 |

The Phase column refers to the delivery phases in `ImplementationPlan.md`.
