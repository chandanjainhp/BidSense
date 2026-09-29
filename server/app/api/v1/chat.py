from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.base import get_db_session
from app.models.chat import Conversation, Message, MessageRole
from app.schemas.chat import (
    ConversationPublic, ConversationCreate, MessagePublic, MessageCreate, ChatMessageRequest,
    ChatReplyResponse, RetrievedSource
)
from app.core.dependencies import get_current_user
from app.models.user import User
from uuid import UUID
from datetime import datetime, timezone
from app.services.ai_service import ai_service
from app.services.rag_service import rag_service

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/conversations", response_model=list[ConversationPublic])
async def list_conversations(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List user's chat conversations ordered by updated_at desc."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    
    items = []
    for conv in conversations:
        # Get message count
        msg_count = await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == conv.id)
        )
        count = msg_count.scalar() or 0
        
        conv_dict = ConversationPublic.model_validate(conv)
        conv_dict.message_count = count
        items.append(conv_dict)
    
    return items


@router.post("/conversations", response_model=ConversationPublic)
async def create_conversation(
    conv_data: ConversationCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new conversation."""
    conversation = Conversation(
        user_id=current_user.id,
        title=conv_data.title,
    )
    db.add(conversation)
    await db.flush()
    await db.refresh(conversation)
    
    return ConversationPublic.model_validate(conversation)


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    await db.delete(conversation)
    await db.commit()
    return {"message": "Conversation deleted"}


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessagePublic])
async def get_messages(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get messages for a conversation."""
    # Verify ownership
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = msg_result.scalars().all()
    
    return [MessagePublic.model_validate(m) for m in messages]


@router.post("/conversations/{conversation_id}/messages", response_model=ChatReplyResponse)
async def send_message(
    conversation_id: UUID,
    msg_data: ChatMessageRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Send a message to a conversation and get a RAG-augmented AI response.

    The user's knowledge base (uploaded documents) is searched for relevant
    passages; those passages are injected into the system prompt and returned
    as `sources` so the client can render citations.
    """
    # Verify ownership
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Save user message
    user_message = Message(
        conversation_id=conversation_id,
        role=MessageRole.USER,
        content=msg_data.content,
    )
    db.add(user_message)
    await db.flush()
    
    # Get last 10 messages for context
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    recent_messages = list(reversed(msg_result.scalars().all()))
    
    # Build messages list for AI
    messages_for_ai = [{"role": m.role.value, "content": m.content} for m in recent_messages]
    
    # RAG: retrieve relevant passages from the user's knowledge base
    try:
        rag_results = await rag_service.retrieve(
            db, user_id=current_user.id, query=msg_data.content
        )
    except Exception:
        rag_results = []  # knowledge base unavailable -> fall back to plain chat
    context_block = rag_service.build_context_block(rag_results)
    context = {"system_prompt": rag_service.build_rag_system_prompt(context_block)}
    
    # Call AI service
    ai_response_text = ""
    async for token in ai_service.chat(messages_for_ai, context):
        ai_response_text += token
    
    # Save AI response
    ai_message = Message(
        conversation_id=conversation_id,
        role=MessageRole.AI,
        content=ai_response_text,
    )
    db.add(ai_message)
    
    # Update conversation timestamp
    conversation.updated_at = datetime.now(timezone.utc)
    if not conversation.title and msg_data.content:
        conversation.title = msg_data.content[:50]
    
    await db.flush()
    await db.refresh(ai_message)
    
    reply = ChatReplyResponse.model_validate(ai_message)
    reply.sources = [
        RetrievedSource(
            document_id=str(r["document_id"]),
            filename=r["filename"],
            chunk_index=r["chunk_index"],
            score=round(r["score"], 4),
            excerpt=r["content"][:200],
        )
        for r in rag_results
    ]
    return reply
