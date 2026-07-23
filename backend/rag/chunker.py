from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.config import settings

def chunk_text(
    text: str,
    metadata: Dict[str, Any],
    chunk_size: int = settings.CHUNK_SIZE,
    chunk_overlap: int = settings.CHUNK_OVERLAP
) -> List[Dict[str, Any]]:
    """Chunks text recursively and attaches metadata to each chunk."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    docs = splitter.create_documents([text], metadatas=[metadata])
    
    chunks = []
    for idx, doc in enumerate(docs):
        chunk_meta = doc.metadata.copy()
        chunk_meta["chunk_id"] = f"{metadata.get('doc_id', 'doc')}_chunk_{idx}"
        chunk_meta["chunk_index"] = idx
        chunks.append({
            "id": chunk_meta["chunk_id"],
            "text": doc.page_content,
            "metadata": chunk_meta
        })
    return chunks
