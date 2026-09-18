# 14. Retrieval-Augmented Generation (RAG) Architecture

## 14.1 Overview

Retrieval-Augmented Generation (RAG) is the core intelligence layer of BidSense.

Instead of relying only on the knowledge already contained in a Large Language Model (LLM), the RAG pipeline retrieves relevant procurement documents from the organization's knowledge base and injects them into the prompt before generating a response.

This enables the AI to answer questions using organization-specific information while reducing hallucinations.

---

# 14.2 Objectives

The RAG system is designed to:

* Reduce AI hallucinations
* Answer questions using organization documents
* Support semantic search
* Improve proposal analysis
* Improve compliance verification
* Provide source citations
* Support large document collections
* Scale across multiple organizations

---

# 14.3 High-Level Architecture

```mermaid
flowchart TB

User

↓

React Frontend

↓

FastAPI Backend

↓

AI Service

↓

Retriever

↓

Qdrant

↓

Relevant Chunks

↓

Prompt Builder

↓

Gemini

↓

Response Parser

↓

Final Response
```

---

# 14.4 RAG Components

```text
RAG System

├── Document Loader
├── Document Parser
├── Metadata Extractor
├── Chunking Engine
├── Embedding Service
├── Vector Store
├── Retriever
├── Reranker
├── Context Builder
├── Prompt Builder
├── LLM Provider
├── Response Parser
├── Citation Builder
└── Memory Manager
```

---

# 14.5 Supported Documents

The RAG pipeline supports:

* PDF
* DOCX
* XLSX
* CSV
* TXT
* Markdown
* HTML
* Images (OCR)
* Procurement Policies
* Contracts
* Vendor Documents
* Previous RFPs
* Previous Proposals

---

# 14.6 Document Ingestion Pipeline

```mermaid
flowchart LR

Upload

↓

Validation

↓

Virus Scan

↓

Metadata Extraction

↓

Text Extraction

↓

Chunking

↓

Embedding

↓

Qdrant

↓

Ready For Search
```

---

# 14.7 Document Parsing

Supported parsers

| Format   | Parser     |
| -------- | ---------- |
| PDF      | pypdf          |
| DOCX     | python-docx    |
| XLSX     | openpyxl       |
| CSV      | pandas         |
| Images   | pytesseract OCR|
| Markdown | markdown-it-py |

Extracted information

* Plain Text
* Tables
* Metadata
* Images
* Page Numbers
* File Information

---

# 14.8 Metadata Extraction

Metadata includes

```text
Document Name

Organization

Vendor

RFP

Proposal

File Type

Upload Date

Uploaded By

Language

Page Count

Version
```

Metadata improves retrieval accuracy.

---

# 14.9 Chunking Strategy

Documents are divided into smaller chunks.

Reasons

* Token limits
* Better retrieval
* Better embeddings
* Lower cost

---

## Chunk Types

### Fixed Size

Example

```text
500 Tokens
```

---

### Recursive Chunking

Breaks by

* Heading
* Paragraph
* Sentence

Preferred for procurement documents.

---

### Semantic Chunking

Groups content based on meaning.

Future enhancement.

---

# 14.10 Chunk Metadata

Each chunk stores

* Chunk ID
* Document ID
* Section
* Page Number
* Token Count
* Parent Document
* Organization ID

---

# 14.11 Embedding Pipeline

```mermaid
flowchart LR

Chunk

↓

Embedding Model

↓

Vector

↓

Qdrant
```

Embeddings represent semantic meaning rather than exact text.

---

# 14.12 Embedding Provider

Initial provider

Gemini Embeddings

Future support

* OpenAI Embeddings
* Voyage AI
* Jina AI
* BAAI
* Local Embedding Models

The embedding provider is abstracted behind the Provider Pattern.

---

# 14.13 Vector Database

Technology

Qdrant

Stores

* Embeddings
* Metadata
* Vector IDs
* Payload

Qdrant is optimized for

* Similarity Search
* Nearest Neighbor Search
* Hybrid Search
* Metadata Filtering

---

# 14.14 Retrieval Process

```mermaid
flowchart LR

User Question

↓

Embedding

↓

Qdrant Search

↓

Top K Chunks

↓

Reranker

↓

Prompt Builder
```

---

# 14.15 Retrieval Strategy

The retriever searches using

* Semantic Similarity
* Organization Filter
* Document Filter
* Vendor Filter
* RFP Filter
* Proposal Filter
* Metadata Filter

Only documents belonging to the requesting organization are searched.

---

# 14.16 Reranking

Initial search returns

Top 20 Chunks

↓

AI Reranker

↓

Top 5 Chunks

↓

LLM

Benefits

* Higher accuracy
* Better relevance
* Reduced token usage

---

# 14.17 Context Builder

The Context Builder combines

* User Question
* Retrieved Chunks
* Previous Chat
* Organization Context
* User Role
* Business Rules

into a single context package.

---

# 14.18 Prompt Builder

Prompt contains

```text
System Prompt

↓

Business Instructions

↓

Retrieved Context

↓

User Question

↓

Output Instructions
```

Prompt templates are version-controlled.

---

# 14.19 Response Generation

Gemini generates

* Answer
* Summary
* Analysis
* Recommendation
* Compliance Report

---

# 14.20 Citation Builder

Every AI answer should reference the original documents.

Example

```text
Source

Vendor_Guidelines.pdf

Page 12

Section 4.2
```

This improves transparency and user trust.

---

# 14.21 Conversation Memory

Memory consists of

Short-Term Memory

* Current Conversation

Long-Term Memory

* Previous Chats
* Organization Knowledge
* User Preferences (when applicable)

Memory improves follow-up conversations.

---

# 14.22 RAG Security

The RAG system enforces

* Organization isolation
* Permission validation
* Metadata filtering
* Prompt sanitization
* Prompt injection detection
* Secure document access

Documents from one organization must never be retrieved for another.

---

# 14.23 Performance Optimization

Optimization techniques

* Cached embeddings
* Incremental indexing
* Batch embedding generation
* Parallel document parsing
* Retrieval caching
* Streaming responses
* Background indexing

---

# 14.24 Failure Recovery

If vector retrieval fails

1. Retry retrieval.
2. Retry embedding lookup.
3. Fall back to LLM without context (if appropriate).
4. Log the failure.
5. Notify monitoring systems if thresholds are exceeded.

---

# 14.25 RAG Pipeline

```mermaid
flowchart TB

Upload Document

↓

Parse

↓

Extract Text

↓

Chunk

↓

Generate Embeddings

↓

Store In Qdrant

↓

User Question

↓

Generate Query Embedding

↓

Retrieve Top K

↓

Rerank

↓

Build Context

↓

Generate Prompt

↓

Gemini

↓

Response

↓

Citations
```

---

# 14.26 RAG Directory Structure

```text
src/

ai/

├── rag/
│   ├── rag_service.py
│   ├── retriever.py
│   ├── reranker.py
│   ├── vector_store.py
│   ├── context_builder.py
│   ├── prompt_builder.py
│   ├── response_parser.py
│   ├── citation_builder.py
│   └── memory.py
│
├── embeddings/
│   ├── embedding_service.py
│   ├── embed_document.py
│   └── embed_chunk.py
│
├── parsers/
│
├── chunking/
│
└── loaders/
```

---

# 14.27 Database Responsibilities

| Component                  | Storage                          |
| -------------------------- | -------------------------------- |
| PostgreSQL                 | Business data, document metadata |
| Redis                      | AI cache, conversation cache     |
| Qdrant                     | Vector embeddings                |
| Local Storage / Cloudinary | Original uploaded files          |

---

# 14.28 Summary

The BidSense RAG architecture transforms uploaded procurement documents into searchable knowledge by parsing, chunking, embedding, and indexing them in Qdrant. When a user asks a question, the system retrieves the most relevant document fragments, builds a context-aware prompt, and sends it to Gemini for response generation. This approach significantly improves answer quality, reduces hallucinations, provides source citations, and enables AI features that are grounded in organization-specific procurement data.
a