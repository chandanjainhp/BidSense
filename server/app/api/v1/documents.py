from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db_session
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.schemas.document import (
    DocumentPublic,
    DocumentListResponse,
    DocumentSearchRequest,
    DocumentSearchResponse,
    RetrievedChunk,
    RagStatsResponse,
    RagQueryRequest,
    RagAnswerResponse,
)
from app.services.rag_service import rag_service

router = APIRouter(prefix="/documents", tags=["Documents (RAG)"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md"}


@router.post("", response_model=DocumentPublic, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Upload and ingest a document into the RAG knowledge base (pdf, docx, txt, md)."""
    filename = file.filename or "untitled"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '.{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    raw = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit",
        )
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    doc = await rag_service.ingest_document(db, user_id=current_user.id, filename=filename, raw=raw)
    return DocumentPublic.model_validate(doc)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List the current user's knowledge-base documents."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return DocumentListResponse(items=[DocumentPublic.model_validate(d) for d in docs], total=len(docs))


@router.get("/stats", response_model=RagStatsResponse)
async def rag_stats(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Aggregate stats about the knowledge base."""
    total = (await db.execute(select(func.count(Document.id)).where(Document.user_id == current_user.id))).scalar() or 0
    ready = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.user_id == current_user.id, Document.status == DocumentStatus.READY
            )
        )
    ).scalar() or 0
    failed = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.user_id == current_user.id, Document.status == DocumentStatus.FAILED
            )
        )
    ).scalar() or 0
    chunks = (
        await db.execute(
            select(func.count(DocumentChunk.id))
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(Document.user_id == current_user.id)
        )
    ).scalar() or 0
    return RagStatsResponse(documents=total, chunks=chunks, ready_documents=ready, failed_documents=failed)


@router.post("/search", response_model=DocumentSearchResponse)
async def search_documents(
    body: DocumentSearchRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Hybrid (semantic + keyword) search over the user's knowledge base."""
    results = await rag_service.retrieve(
        db, user_id=current_user.id, query=body.query, top_k=body.top_k, mode=body.mode
    )
    return DocumentSearchResponse(
        query=body.query,
        mode=body.mode,
        results=[
            RetrievedChunk(
                document_id=r["document_id"],
                filename=r["filename"],
                chunk_index=r["chunk_index"],
                content=r["content"],
                score=round(r["score"], 4),
            )
            for r in results
        ],
    )


@router.post("/ask", response_model=RagAnswerResponse)
async def ask_knowledge_base(
    body: RagQueryRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """One-shot Q&A over the knowledge base. Returns the answer plus cited chunks."""
    results = await rag_service.retrieve(db, user_id=current_user.id, query=body.question, top_k=body.top_k)
    context_block = rag_service.build_context_block(results)
    system_prompt = rag_service.build_rag_system_prompt(context_block)

    from app.services.ai_service import ai_service

    answer_parts: list[str] = []
    async for token in ai_service.chat(
        [{"role": "user", "content": body.question}], {"system_prompt": system_prompt}
    ):
        answer_parts.append(token)
    answer = "".join(answer_parts)

    return RagAnswerResponse(
        question=body.question,
        answer=answer,
        sources=[
            RetrievedChunk(
                document_id=r["document_id"],
                filename=r["filename"],
                chunk_index=r["chunk_index"],
                content=r["content"],
                score=round(r["score"], 4),
            )
            for r in results
        ],
    )


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a document and all of its chunks (vectors) from the knowledge base."""
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await rag_service.delete_document(db, doc)
    return {"message": f"Document '{doc.filename}' deleted"}


@router.get("/{document_id}", response_model=list[RetrievedChunk])
async def get_document_chunks(
    document_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Inspect a document's chunks (for debugging ingestion quality)."""
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    chunks = (
        await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == doc.id)
            .order_by(DocumentChunk.chunk_index)
        )
    ).scalars().all()
    return [
        RetrievedChunk(
            document_id=doc.id, filename=doc.filename, chunk_index=c.chunk_index, content=c.content, score=0.0
        )
        for c in chunks
    ]
