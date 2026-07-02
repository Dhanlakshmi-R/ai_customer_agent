import json
import os
import re
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from src.core.config import settings
from src.core.models import KnowledgeItem

class KnowledgeBase:
    """
    Manages the Retrieval-Augmented Generation (RAG) backend.
    This class handles loading files (PDFs, TXT, JSON), chunking the text into smaller pieces, 
    and storing them in a local vector database called ChromaDB. 
    It also provides the search functionality to retrieve relevant articles during a chat.
    """
    def __init__(self):
        # Initialize ChromaDB persistent client which stores data locally on disk (not in the cloud)
        self.client = chromadb.PersistentClient(path=settings.vector_store_path)
        
        # Get or create a collection (similar to a SQL table) for our knowledge base
        self.collection = self.client.get_or_create_collection(
            name="knowledge_base",
            metadata={"hnsw:space": "cosine"} # Use cosine similarity for measuring how close texts are
        )

    def ingest_file(self, file_path: str) -> int:
        """
        Reads a file from the file system, extracts its text based on the file type, 
        and sends the text to be chunked and indexed into ChromaDB.
        Returns the number of chunks that were successfully indexed.
        """
        ext = Path(file_path).suffix.lower()
        text = ""
        
        # Handle different file extensions gracefully
        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        elif ext == ".pdf":
            try:
                import PyPDF2
                with open(file_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    text = "\n".join(page.extract_text() or "" for page in reader.pages)
            except ImportError:
                text = f"[PDF content could not be extracted from {file_path}]"
        elif ext == ".docx":
            try:
                from docx import Document
                doc = Document(file_path)
                text = "\n".join(p.text for p in doc.paragraphs)
            except ImportError:
                text = f"[DOCX content could not be extracted from {file_path}]"
        elif ext == ".json":
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                text = "\n".join(
                    item.get("content", item.get("text", json.dumps(item)))
                    for item in data
                )
            elif isinstance(data, dict):
                text = json.dumps(data)
        elif ext in (".md", ".csv", ".html"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()

        if not text.strip():
            return 0

        return self._chunk_and_index(text, {"source": file_path})

    def ingest_directory(self, directory: str | None = None) -> int:
        directory = directory or settings.knowledge_base_dir
        total = 0
        if not os.path.isdir(directory):
            return 0
        for fname in os.listdir(directory):
            fpath = os.path.join(directory, fname)
            if os.path.isfile(fpath):
                total += self.ingest_file(fpath)
        return total

    def _chunk_and_index(self, text: str, metadata: dict) -> int:
        chunks = self._split_text(text)
        if not chunks:
            return 0
            
        documents = []
        metadatas = []
        ids = []
        
        base_id = metadata.get("source", "manual").replace("\\", "_").replace("/", "_")
        
        for i, chunk_text in enumerate(chunks):
            if not chunk_text.strip():
                continue
            documents.append(chunk_text.strip())
            metadatas.append(metadata)
            ids.append(f"{base_id}_chunk_{i}")
            
        if documents:
            self.collection.upsert(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
        return len(documents)

    def _split_text(self, text: str) -> list[str]:
        paragraphs = re.split(r"\n\s*\n", text)
        chunks = []
        buffer = ""
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if len(buffer) + len(para) < settings.chunk_size:
                buffer += "\n" + para if buffer else para
            else:
                if buffer:
                    chunks.append(buffer)
                buffer = para
        if buffer:
            chunks.append(buffer)

        result = []
        for chunk in chunks:
            if len(chunk) > settings.chunk_size * 1.5:
                sentences = re.split(r"(?<=[.!?])\s+", chunk)
                sub = ""
                for s in sentences:
                    if len(sub) + len(s) > settings.chunk_size and sub:
                        result.append(sub)
                        sub = s
                    else:
                        sub += " " + s if sub else s
                if sub:
                    result.append(sub)
            else:
                result.append(chunk)
        return result

    def search(self, query: str, top_k: int = 3) -> list[KnowledgeItem]:
        """
        Searches the ChromaDB collection for the most relevant text chunks 
        based on the provided query (e.g., the customer's message).
        Returns a list of KnowledgeItem objects to be used by the RAG pipeline.
        """
        # If the collection is empty, chroma returns an error on query, so we can check count
        if self.collection.count() == 0:
            return []
            
        # Execute the vector similarity search
        results = self.collection.query(
            query_texts=[query],
            n_results=top_k
        )
        
        kb_results = []
        if results and results['documents'] and len(results['documents'][0]) > 0:
            docs = results['documents'][0]
            metas = results['metadatas'][0]
            distances = results['distances'][0] if 'distances' in results and results['distances'] else [0]*len(docs)
            
            for i in range(len(docs)):
                doc_text = docs[i]
                meta = metas[i] if metas and i < len(metas) else {}
                dist = distances[i]
                
                # Chroma cosine distance ranges 0 to 1, with 0 being exact match. We invert it.
                relevance = max(0.0, 1.0 - dist)
                
                source = meta.get("source", "knowledge")
                title = os.path.basename(source)
                
                kb_results.append(KnowledgeItem(
                    title=title,
                    content=doc_text,
                    relevance_score=relevance,
                    source=source
                ))
                
        return kb_results

    def add_text(self, text: str, source: str = "manual") -> int:
        return self._chunk_and_index(text, {"source": source})


knowledge_base = KnowledgeBase()
