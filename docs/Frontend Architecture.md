## 10. Frontend Architecture

## 10.1 Overview

The BidSense frontend is built as a modern Single Page Application (SPA) using React 19.

The frontend follows a component-driven architecture with a clear separation between presentation, business logic, state management, routing, and API communication.

The primary goals are:

* Modular design
* Reusable UI components
* Fast rendering
* Type-safe validation
* Responsive design
* Scalable project structure
* Clean developer experience

---

# 10.2 Technology Stack

| Layer        | Technology      |
| ------------ | --------------- |
| Framework    | React 19        |
| Build Tool   | Vite            |
| Routing      | React Router 7  |
| Styling      | Tailwind CSS v4 |
| Forms        | React Hook Form |
| Validation   | Zod             |
| Server State | TanStack Query  |
| HTTP Client  | Axios           |
| Charts       | Recharts        |
| Icons        | Lucide React    |

---

# 10.3 Frontend Folder Structure

```text
frontend/
│
├── public/
│
├── src/
│   ├── api/
│   ├── assets/
│   ├── components/
│   ├── constants/
│   ├── context/
│   ├── features/
│   ├── hooks/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   ├── styles/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
```

---

# 10.4 Application Layers

```mermaid
flowchart TB

Pages

↓

Components

↓

Hooks

↓

Services

↓

API Client

↓

FastAPI Backend
```

---

# 10.5 Component Architecture

The UI is built using reusable components.

## Base Components

Examples

* Button
* Input
* Textarea
* Card
* Badge
* Avatar
* Spinner
* Modal
* Drawer
* Tabs
* Tooltip

---

## Business Components

Examples

* VendorCard
* ProposalCard
* RFPCard
* DashboardWidget
* NotificationCard
* PaymentCard

---

## Layout Components

Examples

* Sidebar
* Navbar
* Footer
* Header
* PageContainer
* DashboardLayout

---

# 10.6 Routing Architecture

React Router manages application navigation.

```mermaid
flowchart LR

Login

↓

Dashboard

├── Vendors

├── RFPs

├── Proposals

├── AI Assistant

├── Payments

├── Reports

└── Settings
```

---

## Route Categories

### Public Routes

* Login
* Register
* Forgot Password
* Reset Password

---

### Protected Routes

* Dashboard
* Vendors
* RFPs
* Proposals
* Payments
* Reports
* Settings

---

### Admin Routes

* Organization
* Team Members
* Billing
* User Roles
* Permissions

---

# 10.7 Authentication Flow

```mermaid
sequenceDiagram

User->>Login Page

Login Page->>API

API-->>JWT

JWT-->>Local State

Protected Route-->>Dashboard
```

Authentication process

1. User logs in.
2. Backend returns Access Token.
3. Refresh Token is stored as an HttpOnly cookie.
4. Frontend stores user state.
5. Protected routes become accessible.

---

# 10.8 State Management

The frontend uses two different state types.

## Local State

Managed using:

* useState
* useReducer

Examples

* Dialog visibility
* Form values
* Filters

---

## Server State

Managed using TanStack Query.

Examples

* Vendors
* RFPs
* Dashboard
* Notifications
* Payments

Benefits

* Caching
* Automatic refetching
* Optimistic updates
* Background synchronization

---

# 10.9 API Layer

Axios provides centralized API communication.

Responsibilities

* Base URL
* Authorization header
* Token refresh
* Global error handling
* Request interceptors
* Response interceptors

```mermaid
flowchart LR

Component

↓

Service

↓

Axios

↓

Backend
```

---

# 10.10 Services

Each business domain has a dedicated service.

Examples

```text
auth.service.js

vendor.service.js

rfp.service.js

proposal.service.js

payment.service.js

ai.service.js
```

Services contain only API communication logic.

---

# 10.11 Form Handling

React Hook Form manages forms.

Combined with Zod.

Responsibilities

* Validation
* Error messages
* Reset
* Default values
* Submission

---

# 10.12 UI Design System

The UI follows a shared design system.

Typography

* Headings
* Body
* Caption

Spacing

* 4px Grid System

Colors

* Primary
* Secondary
* Success
* Warning
* Danger
* Neutral

Border Radius

* Consistent across all components.

---

# 10.13 Feature Modules

Each business feature has its own directory.

Examples

```text
features/

auth/

vendors/

rfps/

proposals/

dashboard/

payments/

chat/

notifications/

settings/
```

Each feature contains

* Components
* Hooks
* Services
* Validation
* Utilities

---

# 10.14 Dashboard Architecture

Dashboard widgets load independently.

Examples

* Total Vendors
* Active RFPs
* Open Proposals
* Revenue
* Subscription
* AI Usage
* Activity Timeline

Each widget uses its own query for better loading performance.

---

# 10.15 AI Frontend Flow

```mermaid
flowchart TB

Chat Input

↓

API Request

↓

Backend

↓

Gemini

↓

Streaming Response

↓

Markdown Renderer

↓

Chat Window
```

Future enhancement:

* Streaming responses using Server-Sent Events (SSE) or WebSockets.

---

# 10.16 File Upload Flow

```mermaid
flowchart TB

Choose File

↓

Validation

↓

Preview

↓

Upload

↓

Backend

↓

Processing

↓

Success
```

Supported formats

* PDF
* DOCX
* XLSX
* CSV
* Images

---

# 10.17 Error Handling

The frontend provides consistent error handling.

Examples

* Validation errors
* Network errors
* Authentication errors
* Permission errors
* AI errors
* Payment errors

Errors are displayed using toast notifications and inline form messages where appropriate.

---

# 10.18 Performance Strategy

Optimization techniques

* Lazy loading
* Route-based code splitting
* Memoization
* Virtualized tables
* Image optimization
* Query caching
* Debounced search
* Infinite scrolling

---

# 10.19 Security

Frontend security includes

* Protected routes
* HttpOnly Refresh Tokens
* CSRF protection
* Input validation
* XSS prevention
* Secure API communication
* Content Security Policy compatibility

---

# 10.20 Responsive Design

Supported devices

* Mobile
* Tablet
* Laptop
* Desktop
* Large monitors

Layouts adapt using responsive breakpoints.

---

# 10.21 Frontend Request Lifecycle

```mermaid
sequenceDiagram

User->>Component

Component->>Service

Service->>Axios

Axios->>Backend

Backend-->>Axios

Axios-->>Service

Service-->>Component

Component-->>User
```

---

# 10.22 Design Principles

The frontend follows

* Component-Based Architecture
* Feature-Based Organization
* Reusable UI
* Separation of Concerns
* Responsive Design
* Accessibility
* Performance Optimization
* API-First Development

---

# 10.23 Summary

The BidSense frontend architecture is designed to deliver a fast, responsive, and maintainable user experience. React provides a modular component model, React Router manages navigation, TanStack Query handles server state efficiently, React Hook Form and Zod simplify form handling and validation, and Axios centralizes API communication. Together, these technologies support a scalable frontend that integrates cleanly with the backend while remaining easy to extend as new procurement and AI features are added.
a