import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database.connection import get_db
from backend.database.repository import Repository
from backend.rag.ingester import extract_text_from_file
from backend.rag.chunker import chunk_text
from backend.rag.vectorstore import vector_store
from backend.authentication.rbac import get_current_user
from backend.database.models import User

router = APIRouter(prefix="/rag", tags=["Knowledge Base & RAG"])

class SearchQuerySchema(BaseModel):
    query: str
    top_k: Optional[int] = 3

@router.post("/upload")
async def upload_knowledge_document(
    file: UploadFile = File(...),
    category: str = Form("General"),
    topic: Optional[str] = Form(None),
    keywords: Optional[str] = Form(None),
    version: str = Form("1.0"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload document (PDF, DOCX, TXT, MD), extract text, chunk (800/150), embed and store in ChromaDB."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".txt", ".md", ".markdown"]:
        raise HTTPException(status_code=400, detail=f"Unsupported file extension: {ext}")

    doc_id = str(uuid.uuid4())
    save_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}_{file.filename}")
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        raw_text = extract_text_from_file(save_path)
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from document.")

        metadata = {
            "doc_id": doc_id,
            "title": file.filename,
            "category": category,
            "topic": topic or category,
            "source": file.filename,
            "version": version
        }

        chunks = chunk_text(
            text=raw_text,
            metadata=metadata,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )

        vector_store.add_chunks(chunks)

        repo = Repository(db)
        doc = await repo.add_document(
            title=file.filename,
            file_path=save_path,
            file_type=ext.replace(".", "").upper(),
            category=category,
            chunk_count=len(chunks),
            topic=topic,
            keywords=keywords,
            version=version
        )

        return {
            "id": doc.id,
            "title": doc.title,
            "category": doc.category,
            "chunk_count": doc.chunk_count,
            "created_at": doc.created_at
        }
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}")

@router.post("/search")
async def search_knowledge_base(
    data: SearchQuerySchema,
    db: AsyncSession = Depends(get_db)
):
    results = vector_store.search(query=data.query, top_k=data.top_k)
    return {"query": data.query, "results": results}

@router.get("/documents")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = Repository(db)
    docs = await repo.list_documents()
    return [
        {
            "id": d.id,
            "title": d.title,
            "file_type": d.file_type,
            "category": d.category,
            "chunk_count": d.chunk_count,
            "topic": d.topic,
            "keywords": d.keywords,
            "version": d.version,
            "created_at": d.created_at
        }
        for d in docs
    ]

@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = Repository(db)
    vector_store.delete_document_chunks(doc_id)
    success = await repo.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": "Document deleted from RAG knowledge base."}
