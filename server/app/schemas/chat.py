from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from enum import Enum


class MessageRoleEnum(str, Enum):
    USER = "user"
    AI = "ai"


class MessageCreate(BaseModel):
    content: str = Field(min_length=1)


class MessagePublic(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    title: str | None = Field(None, max_length=200)


class ConversationPublic(BaseModel):
    id: UUID
    user_id: UUID
    title: str | None
    updated_at: datetime
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ChatMessageRequest(BaseModel):
    content: str
    context: dict | None = None


class ChatStreamResponse(BaseModel):
    token: str
    done: bool = False


class RetrievedSource(BaseModel):
    document_id: str
    filename: str
    chunk_index: int
    score: float
    excerpt: str = ""


class ChatReplyResponse(MessagePublic):
    """AI reply plus the knowledge-base chunks (RAG sources) used to answer."""
    sources: list[RetrievedSource] = []
