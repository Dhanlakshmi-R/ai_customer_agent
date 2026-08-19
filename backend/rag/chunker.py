import re
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.config import settings

def chunk_text(
    text: str,
    metadata: Dict[str, Any],
    chunk_size: int = settings.CHUNK_SIZE,
    chunk_overlap: int = settings.CHUNK_OVERLAP
) -> List[Dict[str, Any]]:
    """Create clean, overlapping semantic chunks with stable retrieval metadata."""
    normalized_text = re.sub(r"[ \t]+", " ", text)
    normalized_text = re.sub(r"\n{3,}", "\n\n", normalized_text).strip()
    if not normalized_text:
        return []

    safe_chunk_size = max(200, chunk_size)
    safe_overlap = max(0, min(chunk_overlap, safe_chunk_size // 2))
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=safe_chunk_size,
        chunk_overlap=safe_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", "? ", "! ", "; ", " ", ""],
    )
    docs = splitter.create_documents([normalized_text], metadatas=[metadata])
    
    chunks = []
    for idx, doc in enumerate(docs):
        chunk_meta = doc.metadata.copy()
        chunk_meta["chunk_id"] = f"{metadata.get('doc_id', 'doc')}_chunk_{idx}"
        chunk_meta["chunk_index"] = idx
        chunk_meta["chunk_length"] = len(doc.page_content)
        chunks.append({
            "id": chunk_meta["chunk_id"],
            "text": doc.page_content,
            "metadata": chunk_meta
        })
    return chunks
