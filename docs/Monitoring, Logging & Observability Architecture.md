# 26. Monitoring, Logging & Observability Architecture

## 26.1 Overview

Monitoring, Logging, and Observability provide operational visibility into every component of the BidSense platform.

The objective is not only to detect failures but also to understand why they occur, how they affect users, and how quickly they can be resolved.

The observability platform continuously collects:

* Metrics
* Logs
* Traces
* Events
* Audit Records
* Health Status
* AI Telemetry
* Infrastructure Metrics

This architecture enables proactive monitoring, faster incident response, and long-term performance optimization.

---

# 26.2 Objectives

The observability platform is designed to:

* Detect failures early.
* Monitor application health.
* Measure system performance.
* Trace distributed requests.
* Monitor AI usage.
* Monitor infrastructure.
* Improve debugging.
* Support SLA monitoring.

---

# 26.3 High-Level Architecture

```mermaid
flowchart TB

Application

↓

Logs

Metrics

Traces

↓

OpenTelemetry

↓

Prometheus

↓

Grafana

↓

Alerts

↓

Engineering Team
```

---

# 26.4 Observability Pillars

BidSense follows the three pillars of observability.

| Pillar  | Purpose                |
| ------- | ---------------------- |
| Logs    | Event history          |
| Metrics | Numerical measurements |
| Traces  | Request flow           |

Additional signals

* Audit Logs
* AI Telemetry
* Business Events

---

# 26.5 Monitoring Components

```text
Monitoring

├── Health Service

├── Metrics Collector

├── Logger

├── Trace Collector

├── Audit Logger

├── Alert Manager

├── Dashboard

├── Incident Manager

└── Reporting
```

---

# 26.6 Application Logging

Every application event generates structured logs.

Log levels

* ERROR
* WARN
* INFO
* DEBUG
* TRACE

Logs include

* Timestamp
* Request ID
* User ID
* Organization ID
* Module
* Severity
* Duration
* Message

Passwords, tokens, OTPs, API keys, and payment secrets must never be written to logs.

---

# 26.7 Structured Logging

Example

```json
{
  "timestamp":"2026-07-16T14:35:00Z",
  "level":"INFO",
  "requestId":"req_123456",
  "organizationId":"org_123",
  "userId":"usr_789",
  "module":"ProposalService",
  "message":"Proposal submitted successfully",
  "duration":245
}
```

Structured logs simplify searching, filtering, and correlation.

---

# 26.8 Metrics Collection

Application metrics include

* Request Count
* Response Time
* Error Rate
* Success Rate
* Concurrent Users
* Queue Length
* Cache Hit Ratio

Infrastructure metrics include

* CPU Usage
* Memory Usage
* Disk Usage
* Network Traffic
* Container Health

---

# 26.9 Business Metrics

Business metrics include

* Active Organizations
* Vendors
* Active RFPs
* Submitted Proposals
* Award Rate
* Revenue
* Subscription Growth
* AI Requests
* AI Credits Consumed

Business metrics help evaluate platform usage beyond technical health.

---

# 26.10 Distributed Tracing

Every request receives a Trace ID.

```mermaid
sequenceDiagram

Client->>API

API->>Service

Service->>Repository

Repository->>Database

Database-->>Repository

Repository-->>Service

Service-->>API

API-->>Client
```

Each span records

* Duration
* Status
* Errors
* Dependencies

---

# 26.11 AI Telemetry

The AI platform records

* Provider
* Model
* Prompt Version
* Token Usage
* Processing Time
* Retrieval Time
* Embedding Time
* Confidence Score
* Failure Reason

These metrics support optimization and cost analysis.

---

# 26.12 RAG Monitoring

The Retrieval-Augmented Generation pipeline tracks

* Retrieval Time
* Embedding Time
* Vector Search Latency
* Retrieved Chunk Count
* Context Size
* Citation Count
* Retrieval Accuracy

These metrics identify bottlenecks in AI workflows.

---

# 26.13 Health Checks

Health endpoints

```text
GET /health

GET /ready

GET /live
```

Health validation includes

* PostgreSQL
* Redis
* Qdrant
* AI Provider
* Storage
* SMTP
* Razorpay Connectivity (basic availability only)

---

# 26.14 Infrastructure Monitoring

Infrastructure components

* Backend
* Frontend
* PostgreSQL
* Redis
* Qdrant
* Nginx
* Worker Processes
* Scheduler

Each service exposes health and metrics endpoints.

---

# 26.15 Alerting

Alerts are generated for

* High Error Rate
* API Downtime
* Database Failure
* Redis Failure
* AI Provider Failure
* Payment Failures
* Queue Overflow
* High Memory Usage
* High CPU Usage

Alert severity

* Critical
* High
* Medium
* Low

---

# 26.16 Audit Logging

Audit logs record security-sensitive actions.

Examples

* Login
* Logout
* Password Reset
* Vendor Creation
* RFP Publication
* Proposal Award
* Payment Verification
* Role Changes
* Organization Creation

Audit records are immutable.

---

# 26.17 Performance Monitoring

Performance metrics

* API Latency
* Database Query Time
* Redis Response Time
* Qdrant Query Time
* AI Response Time
* Dashboard Load Time
* Upload Processing Time

Performance regressions trigger alerts when thresholds are exceeded.

---

# 26.18 Error Tracking

Captured information

* Exception Type
* Stack Trace
* Request ID
* User Context
* Organization
* Module
* Environment

Sensitive data is removed before storage.

---

# 26.19 Dashboard Monitoring

Operational dashboards display

* API Health
* Infrastructure Health
* AI Health
* Payment Health
* Queue Status
* Background Jobs
* Active Alerts

Separate dashboards are maintained for technical and business stakeholders.

---

# 26.20 Monitoring Stack

Current stack

* structlog (JSON logging)
* FastAPI middleware
* Health Endpoints

Recommended production stack

* OpenTelemetry
* Prometheus
* Grafana
* Loki
* Alertmanager

Future additions

* Jaeger
* Tempo

---

# 26.21 Incident Response

Incident workflow

```mermaid
flowchart LR

Alert

↓

Detection

↓

Investigation

↓

Mitigation

↓

Recovery

↓

Root Cause Analysis

↓

Post-Incident Review
```

Every critical incident is documented and reviewed.

---

# 26.22 Log Retention

Recommended retention

| Log Type         | Retention |
| ---------------- | --------- |
| Application Logs | 30 Days   |
| Audit Logs       | 1 Year    |
| Payment Logs     | 7 Years   |
| Security Logs    | 1 Year    |
| AI Telemetry     | 90 Days   |

Retention periods should comply with organizational policies and applicable regulations.

---

# 26.23 Business Rules

* Every request receives a Request ID.
* Every distributed request receives a Trace ID.
* Audit logs cannot be modified.
* Sensitive data is never logged.
* Failed health checks trigger alerts.
* Metrics collection must not significantly impact application performance.

---

# 26.24 Directory Structure

```text
src/

monitoring/

├── logger.py
├── metrics.py
├── tracing.py
├── health.py
├── audit.py
├── telemetry.py
├── alerts.py
└── middleware/

    ├── request_id.py
    ├── request_logger.py
    └── metrics_middleware.py
```

---

# 26.25 Future Enhancements

Planned improvements

* Distributed tracing across microservices
* AI anomaly detection
* Predictive failure analysis
* Intelligent alert correlation
* Automated incident response
* Real-time business KPI monitoring
* Custom organization dashboards

---

# 26.26 Summary

The Monitoring, Logging & Observability Architecture provides complete operational visibility across the BidSense platform. Through structured logging, distributed tracing, metrics collection, AI telemetry, health monitoring, and centralized dashboards, engineering teams can detect issues quickly, troubleshoot efficiently, and maintain reliable system performance. The architecture is designed to scale from local development to enterprise production environments while supporting continuous improvement and operational excellence.
