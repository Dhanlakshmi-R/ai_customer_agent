import math
import re
from typing import List, Dict, Any, Optional
from backend.config import settings

class RAGVectorStore:
    def __init__(self, persist_directory: str = settings.CHROMA_PERSIST_DIRECTORY):
        self.persist_directory = persist_directory
        self.chroma_client = None
        self.collection = None
        self.embedding_function = None
        self.in_memory_docs = [] # Fallback search store
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

            self.chroma_client = chromadb.PersistentClient(path=self.persist_directory)
            self.embedding_function = SentenceTransformerEmbeddingFunction(
                model_name=settings.EMBEDDING_MODEL,
            )
            try:
                self.collection = self.chroma_client.get_or_create_collection(
                    name="support_knowledge_base",
                    embedding_function=self.embedding_function,
                    metadata={"embedding_model": settings.EMBEDDING_MODEL},
                )
            except ValueError as error:
                if "embedding function" not in str(error).lower():
                    raise
                # Preserve existing persisted collections created with Chroma's
                # prior default embedding configuration.
                self.collection = self.chroma_client.get_collection(name="support_knowledge_base")
        except Exception as e:
            print(f"[RAGVectorStore] ChromaDB native init warning (using in-memory fallback): {e}")

    def add_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """Adds text chunks to the ChromaDB vector store and in-memory fallback."""
        if not chunks:
            return 0

        valid_chunks = [
            chunk for chunk in chunks
            if isinstance(chunk.get("id"), str)
            and isinstance(chunk.get("text"), str)
            and chunk["text"].strip()
            and isinstance(chunk.get("metadata"), dict)
        ]
        if not valid_chunks:
            return 0

        # Always update in-memory store for fallback guarantee.
        self.in_memory_docs.extend(valid_chunks)

        if self.collection is not None:
            try:
                ids = [c["id"] for c in valid_chunks]
                documents = [c["text"] for c in valid_chunks]
                # Convert list metadata values to strings for ChromaDB compatibility
                metadatas = []
                for c in valid_chunks:
                    meta = {}
                    for k, v in c["metadata"].items():
                        if isinstance(v, (str, int, float, bool)):
                            meta[k] = v
                        else:
                            meta[k] = str(v)
                    metadatas.append(meta)

                self.collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
            except Exception as e:
                print(f"[RAGVectorStore] ChromaDB add_chunks warning: {e}")

        return len(valid_chunks)

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Searches relevant knowledge base chunks."""
        results: List[Dict[str, Any]] = []
        requested_count = max(1, min(int(top_k or 3), 10))

        if self.collection is not None:
            try:
                query_res = self.collection.query(
                    query_texts=[query],
                    n_results=min(requested_count * 3, 30),
                )
                if query_res and query_res.get("documents") and query_res["documents"][0]:
                    docs = query_res["documents"][0]
                    metas = query_res["metadatas"][0] if query_res.get("metadatas") else [{}] * len(docs)
                    distances = query_res["distances"][0] if query_res.get("distances") else [0.5] * len(docs)

                    candidates = [
                        self._build_citation(document, metadata, distance, query)
                        for document, metadata, distance in zip(docs, metas, distances)
                    ]
                    results = self._validate_citations(candidates, requested_count)
                    if results:
                        return results
            except Exception as e:
                print(f"[RAGVectorStore] ChromaDB search error, falling back to heuristic search: {e}")

        # Heuristic fallback matching on in-memory docs
        query_words = self._query_terms(query)
        scored_docs = []
        for doc in self.in_memory_docs:
            doc_text = doc["text"].lower()
            matches = sum(1 for word in query_words if word in doc_text)
            if matches > 0:
                score = round(min(0.95, 0.35 + (matches / max(len(query_words), 1)) * 0.6), 2)
                scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        candidates = [
            self._build_citation(doc["text"], doc["metadata"], None, query, confidence=score)
            for score, doc in scored_docs
        ]
        return self._validate_citations(candidates, requested_count)

    @staticmethod
    def _query_terms(query: str) -> set[str]:
        return {
            token for token in re.findall(r"[a-z0-9]{3,}", query.lower())
            if token not in {"the", "and", "for", "with", "from", "that", "this", "issue"}
        }

    def _build_citation(
        self,
        document: Any,
        metadata: Any,
        distance: Optional[float],
        query: str,
        confidence: Optional[float] = None,
    ) -> Dict[str, Any]:
        metadata = metadata if isinstance(metadata, dict) else {}
        snippet = str(document or "").strip()
        if confidence is None:
            vector_score = 1.0 - min(max(float(distance or 0.0), 0.0), 2.0) / 2.0
            keyword_score = sum(term in snippet.lower() for term in self._query_terms(query))
            keyword_score /= max(len(self._query_terms(query)), 1)
            confidence = 0.75 * vector_score + 0.25 * keyword_score
        return {
            "title": str(metadata.get("title") or metadata.get("source") or "Knowledge Article").strip(),
            "snippet": snippet[:1200],
            "source": str(metadata.get("source") or "Knowledge Base").strip(),
            "category": str(metadata.get("category") or "General").strip(),
            "confidence": round(max(0.0, min(0.99, float(confidence))), 2),
            "chunk_id": str(metadata.get("chunk_id") or "").strip(),
        }

    @staticmethod
    def _validate_citations(citations: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        valid: List[Dict[str, Any]] = []
        seen_chunk_ids = set()
        for citation in citations:
            chunk_id = citation.get("chunk_id")
            if (
                not isinstance(chunk_id, str)
                or not chunk_id
                or chunk_id in seen_chunk_ids
                or not isinstance(citation.get("snippet"), str)
                or not citation["snippet"].strip()
                or not isinstance(citation.get("title"), str)
                or not isinstance(citation.get("source"), str)
                or not isinstance(citation.get("confidence"), (int, float))
                or not math.isfinite(citation["confidence"])
            ):
                continue
            seen_chunk_ids.add(chunk_id)
            valid.append(citation)
        valid.sort(key=lambda citation: citation["confidence"], reverse=True)
        return valid[:limit]

    def delete_document_chunks(self, doc_id: str):
        """Deletes all chunks belonging to a document."""
        self.in_memory_docs = [d for d in self.in_memory_docs if d["metadata"].get("doc_id") != doc_id]
        if self.collection is not None:
            try:
                self.collection.delete(where={"doc_id": doc_id})
            except Exception as e:
                print(f"[RAGVectorStore] Error deleting doc chunks in ChromaDB: {e}")

    def count(self) -> int:
        """Returns total number of indexed chunks in ChromaDB or in-memory fallback."""
        if self.collection is not None:
            try:
                return self.collection.count()
            except Exception:
                pass
        return len(self.in_memory_docs)

vector_store = None

def _get_vector_store():
    global vector_store
    if vector_store is None:
        vector_store = RAGVectorStore()
    return vector_store

def auto_seed_kb():
    """Auto-seeds the vector store with files from data/knowledge_base/ if empty."""
    try:
        vs = _get_vector_store()
    except Exception as e:
        print(f"[RAGAutoSeed] Could not initialise vector store: {e}")
        return
    if vs.count() == 0:
        import os
        from backend.rag.ingester import extract_text_from_file
        from backend.rag.chunker import chunk_text

        kb_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "knowledge_base"))
        if not os.path.exists(kb_dir):
            print(f"[RAGAutoSeed] Knowledge base directory not found at: {kb_dir}")
            return

        total_chunks = 0
        for fname in os.listdir(kb_dir):
            fpath = os.path.join(kb_dir, fname)
            if os.path.isfile(fpath) and fname.endswith(('.md', '.txt', '.pdf', '.docx', '.json')):
                try:
                    text = extract_text_from_file(fpath)
                    if text and text.strip():
                        title = fname.replace("_", " ").replace("-", " ").rsplit(".", 1)[0].title()
                        metadata = {
                            "doc_id": fname,
                            "title": title,
                            "source": fname,
                            "category": "Standard Operating Procedure" if "sop" in fname.lower() else "Knowledge Article"
                        }
                        chunks = chunk_text(text, metadata)
                        added = vs.add_chunks(chunks)
                        total_chunks += added
                except Exception as e:
                    print(f"[RAGAutoSeed] Error ingesting {fname}: {e}")
        print(f"[RAGAutoSeed] Auto-seeded ChromaDB with {total_chunks} chunks from {kb_dir}")
