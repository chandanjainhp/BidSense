# BidSense Documentation

All architecture and requirements documents describe the **Python stack**: FastAPI, SQLAlchemy 2.0 (async) with Alembic, PostgreSQL, Redis, Celery, Qdrant, and a React 19 client. Anything describing an Express/Drizzle backend is out of date and should be corrected rather than followed.

Documents state the **target** design. What is actually built today is tracked in the status table in `FunctionalRequirements.md` §2.19, and the order it gets built in is `ImplementationPlan.md`.

## Start here

| Document | Purpose |
| -------- | ------- |
| `Software ArchitectureDocument.md` | Introduction, vision, scope |
| `BIDSENSE_SYSTEM_DESIGN.md` | Table of contents for the full design set |
| `FunctionalRequirements.md` | Functional scope and current implementation status |
| `Non-FunctionalRequirements.md` | Performance, availability, and quality targets |
| `ImplementationPlan.md` | Phased delivery plan |

## Architecture

| Document | Purpose |
| -------- | ------- |
| `High-LevelSystemArchitecture.md` | System context and component overview |
| `TechnologyStack.md` | Chosen technologies and rationale |
| `ProjectStructure.md` | Repository and module layout |
| `Backend Architecture.md` | Layers, request lifecycle, dependency rules |
| `Frontend Architecture.md` | Client structure and state management |
| `Database Architecture.md` | Data tiers, multi-tenancy, indexing |
| `Database Schema Design.md` | Tables, columns, and relationships |
| `API Architecture & Standards.md` | Response envelope, errors, versioning |
| `BackendImplementationPlan.md` | Endpoint-level contracts reverse-engineered from the client |

## Domain modules

`Authentication & Authorization Architecture.md`, `Vendor Management Architecture.md`, `RFP Management Architecture.md`, `Proposal Management Architecture.md`, `Dashboard & Analytics Architecture.md`, `Notification & Communication Architecture.md`, `Payment & Subscription Architecture.md`

## AI

`AI Agent Architecture.md`, `Retrieval-Augmented Generation (RAG) Architecture.md`, `AIDocumentProcessingPipeline.md`

## Operations

`Security Architecture.md`, `Testing Architecture.md`, `Monitoring, Logging & Observability Architecture.md`, `DevOps & Deployment Architecture.md`
