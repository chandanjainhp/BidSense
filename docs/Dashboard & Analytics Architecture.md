# 22. Dashboard & Analytics Architecture

## 22.1 Overview

The Dashboard & Analytics module serves as the central intelligence hub of BidSense.

It provides procurement teams, managers, executives, and administrators with real-time insights into procurement operations, vendor performance, AI usage, financial metrics, and platform health.

The dashboard aggregates data from multiple modules into actionable visualizations and reports.

---

# 22.2 Objectives

The Dashboard module is designed to:

* Provide real-time procurement insights.
* Monitor procurement performance.
* Track vendor activity.
* Measure AI usage.
* Visualize payment and subscription metrics.
* Generate executive reports.
* Support data-driven decision making.

---

# 22.3 High-Level Architecture

```mermaid
flowchart TB

PostgreSQL

Redis

Qdrant

↓

Analytics Service

↓

Aggregation Engine

↓

Dashboard Service

↓

REST API

↓

React Dashboard

↓

Charts & Widgets
```

---

# 22.4 Dashboard Components

```text
Dashboard Module

├── Dashboard Controller

├── Dashboard Service

├── Analytics Service

├── KPI Engine

├── Report Generator

├── Chart Builder

├── Cache Manager

├── Widget Manager

└── Export Service
```

---

# 22.5 Dashboard Types

## Executive Dashboard

Displays

* Total Procurement Value
* Active RFPs
* Awarded Contracts
* AI Usage
* Vendor Performance
* Revenue
* Subscription Status

---

## Procurement Dashboard

Displays

* Active RFPs
* Closing Soon
* Proposal Status
* Vendor Activity
* Pending Reviews
* Award Progress

---

## Vendor Dashboard

Displays

* Invitations
* Submitted Proposals
* Proposal Status
* AI Feedback
* Performance Rating

---

## Administrator Dashboard

Displays

* Organizations
* Users
* Payments
* AI Usage
* API Requests
* Platform Health

---

# 22.6 KPI Engine

The KPI Engine calculates platform-wide metrics.

Examples

* Total Vendors
* Total RFPs
* Active Procurement
* Award Rate
* Proposal Success Rate
* AI Requests
* Active Organizations
* Revenue
* Monthly Growth

KPIs are cached for performance.

---

# 22.7 Dashboard Widgets

Widgets include

* Total Vendors
* Active RFPs
* Pending Proposals
* Procurement Value
* Revenue
* AI Usage
* Recent Activity
* Upcoming Deadlines
* Subscription Status
* Notifications

Each widget loads independently.

---

# 22.8 Procurement Analytics

Metrics include

* Procurement Volume
* Procurement Value
* Average Procurement Duration
* Award Rate
* Proposal Conversion
* Procurement Cost
* Procurement Timeline

---

# 22.9 Vendor Analytics

Metrics include

* Vendor Growth
* Vendor Performance
* Vendor Ratings
* Vendor Participation
* Proposal Win Rate
* Average Proposal Score
* Vendor Response Time

---

# 22.10 Proposal Analytics

Metrics include

* Submitted Proposals
* Average Proposal Score
* Proposal Success Rate
* Proposal Completion Rate
* AI Compliance Score
* Proposal Quality Distribution

---

# 22.11 AI Analytics

Tracks AI performance.

Metrics

* AI Requests
* Token Usage
* Processing Time
* Provider Usage
* Prompt Categories
* Average Confidence
* Failed Requests
* AI Cost

Charts

* Daily Usage
* Monthly Usage
* Provider Comparison
* AI Feature Usage

---

# 22.12 Financial Analytics

Metrics

* Monthly Revenue
* Annual Revenue
* Active Subscriptions
* Failed Payments
* Refunds
* Average Revenue Per Organization
* Churn Rate
* Plan Distribution

---

# 22.13 User Analytics

Tracks

* Active Users
* New Registrations
* Login Frequency
* Session Duration
* Feature Usage
* User Retention

---

# 22.14 Activity Timeline

Displays chronological events.

Examples

* Vendor Created
* Proposal Submitted
* RFP Published
* Payment Completed
* AI Analysis Finished
* Organization Created

---

# 22.15 Reporting

Supported reports

* Procurement Report
* Vendor Report
* Proposal Report
* AI Usage Report
* Payment Report
* Audit Report
* Organization Report

Reports can be exported as

* PDF
* Excel
* CSV

---

# 22.16 Dashboard APIs

| Method | Endpoint             | Description         |
| ------ | -------------------- | ------------------- |
| GET    | /dashboard           | Dashboard overview  |
| GET    | /dashboard/kpis      | KPI metrics         |
| GET    | /dashboard/vendors   | Vendor analytics    |
| GET    | /dashboard/rfps      | RFP analytics       |
| GET    | /dashboard/proposals | Proposal analytics  |
| GET    | /dashboard/ai        | AI analytics        |
| GET    | /dashboard/payments  | Financial analytics |
| GET    | /dashboard/activity  | Activity timeline   |
| GET    | /dashboard/reports   | Generate reports    |

---

# 22.17 Caching Strategy

Redis caches

* Dashboard KPIs
* Charts
* Frequently requested reports
* Organization statistics
* AI metrics

Cache expiration

| Data              | TTL        |
| ----------------- | ---------- |
| Dashboard KPIs    | 5 Minutes  |
| Vendor Metrics    | 10 Minutes |
| Financial Reports | 15 Minutes |
| AI Metrics        | 5 Minutes  |

---

# 22.18 Data Aggregation

The Analytics Service aggregates data from

* PostgreSQL
* Redis
* Qdrant
* AI Usage Logs
* Payment Records
* Audit Logs

Aggregation jobs execute periodically for expensive calculations.

---

# 22.19 Visualization

Supported chart types

* Line Chart
* Bar Chart
* Pie Chart
* Donut Chart
* Area Chart
* Heatmap
* KPI Cards
* Timeline

---

# 22.20 Real-Time Updates

Future implementation

* WebSockets
* Server-Sent Events (SSE)

Real-time updates include

* Proposal Submission
* New Notifications
* AI Processing Status
* Payment Events
* Procurement Progress

---

# 22.21 Database Tables

Primary tables

```text
dashboard_cache

analytics_events

analytics_snapshots

report_exports

widget_preferences
```

Business data is read from existing domain tables and aggregated for analytics.

---

# 22.22 Business Rules

* Dashboard data is organization-specific.
* Executives view organization-wide analytics.
* Vendors view only their own metrics.
* AI usage is tracked per organization.
* Cached data must refresh automatically after expiration.
* Reports include only authorized data.

---

# 22.23 Security

Dashboard security includes

* Organization isolation
* RBAC
* Data masking
* Secure report downloads
* Audit logging
* Query validation

---

# 22.24 Monitoring

Metrics collected

* Dashboard Load Time
* Report Generation Time
* Cache Hit Ratio
* API Latency
* Query Performance
* Widget Usage
* Export Frequency

---

# 22.25 Future Enhancements

Planned capabilities

* Predictive Procurement Analytics
* AI Forecasting
* Procurement Cost Prediction
* Vendor Risk Heatmaps
* Custom Dashboards
* Drag-and-Drop Widgets
* Scheduled Reports
* Email Report Delivery
* Executive AI Insights

---

# 22.26 Complete Dashboard Workflow

```mermaid
flowchart TB

Business Events

↓

PostgreSQL

↓

Analytics Engine

↓

Redis Cache

↓

Dashboard API

↓

React Dashboard

↓

Charts

↓

Executive Insights
```

---

# 22.27 Summary

The Dashboard & Analytics Architecture provides a unified view of procurement, vendor, AI, financial, and operational metrics across the BidSense platform. By combining data aggregation, intelligent caching, configurable dashboards, and comprehensive reporting, it enables stakeholders to monitor performance, identify trends, and make informed decisions while maintaining high performance and organization-level data isolation.
a