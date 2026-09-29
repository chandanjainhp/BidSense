from uuid import UUID
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class DocumentPublic(BaseModel):
    """Metadata about an indexed knowledge-base document."""
    id: UUID
    filename: str
    file_type: str
    size_bytes: int
    status: Literal["processing", "ready", "failed"]
    chunk_count: int
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    items: list[DocumentPublic]
    total: int


class DocumentSearchRequest(BaseModel):
    """Query the knowledge base with hybrid semantic + keyword search."""
    query: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)
    # "hybrid" blends cosine similarity with keyword overlap; "semantic" / "keyword" are pure modes
    mode: Literal["hybrid", "semantic", "keyword"] = "hybrid"


class RetrievedChunk(BaseModel):
    """A single cited passage returned by retrieval."""
    document_id: UUID
    filename: str
    chunk_index: int
    content: str
    score: float = Field(description="Relevance score, higher = more relevant")


class DocumentSearchResponse(BaseModel):
    query: str
    mode: str
    results: list[RetrievedChunk]


class RagStatsResponse(BaseModel):
    documents: int
    chunks: int
    ready_documents: int
    failed_documents: int


class RagQueryRequest(BaseModel):
    """One-shot ask-the-knowledge-base endpoint (does not touch chat history)."""
    question: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=5, ge=1, le=20)


class RagAnswerResponse(BaseModel):
    """Answer to an ask query, with the cited chunks used as evidence."""
    question: str
    answer: str
    sources: list[RetrievedChunk]
