import os
import math
from typing import List, Dict, Any, Optional
from backend.config import settings

class RAGVectorStore:
    def __init__(self, persist_directory: str = settings.CHROMA_PERSIST_DIRECTORY):
        self.persist_directory = persist_directory
        self.chroma_client = None
        self.collection = None
        self.in_memory_docs = [] # Fallback search store
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
            self.chroma_client = chromadb.PersistentClient(path=self.persist_directory)
            self.collection = self.chroma_client.get_or_create_collection(name="support_knowledge_base")
        except Exception as e:
            print(f"[RAGVectorStore] ChromaDB native init warning (using in-memory fallback): {e}")

    def add_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """Adds text chunks to the ChromaDB vector store and in-memory fallback."""
        if not chunks:
            return 0

        # Always update in-memory store for fallback guarantee
        for chunk in chunks:
            self.in_memory_docs.append(chunk)

        if self.collection is not None:
            try:
                ids = [c["id"] for c in chunks]
                documents = [c["text"] for c in chunks]
                # Convert list metadata values to strings for ChromaDB compatibility
                metadatas = []
                for c in chunks:
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

        return len(chunks)

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Searches relevant knowledge base chunks."""
        results = []

        if self.collection is not None:
            try:
                query_res = self.collection.query(
                    query_texts=[query],
                    n_results=top_k
                )
                if query_res and query_res.get("documents") and query_res["documents"][0]:
                    docs = query_res["documents"][0]
                    metas = query_res["metadatas"][0] if query_res.get("metadatas") else [{}] * len(docs)
                    distances = query_res["distances"][0] if query_res.get("distances") else [0.5] * len(docs)

                    for d, m, dist in zip(docs, metas, distances):
                        # Approximate similarity score from distance
                        confidence = round(max(0.1, min(0.99, 1.0 - (dist / 2.0 if dist else 0.3))), 2)
                        results.append({
                            "title": m.get("title", m.get("source", "Knowledge Article")),
                            "snippet": d,
                            "source": m.get("source", "Knowledge Base"),
                            "category": m.get("category", "General"),
                            "confidence": confidence,
                            "chunk_id": m.get("chunk_id", "")
                        })
                    return results
            except Exception as e:
                print(f"[RAGVectorStore] ChromaDB search error, falling back to heuristic search: {e}")

        # Heuristic fallback matching on in-memory docs
        query_words = set(query.lower().split())
        scored_docs = []
        for doc in self.in_memory_docs:
            doc_text = doc["text"].lower()
            matches = sum(1 for w in query_words if w in doc_text)
            if matches > 0:
                score = round(min(0.95, 0.4 + (matches * 0.15)), 2)
                scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        for score, doc in scored_docs[:top_k]:
            results.append({
                "title": doc["metadata"].get("title", doc["metadata"].get("source", "Knowledge Article")),
                "snippet": doc["text"],
                "source": doc["metadata"].get("source", "Knowledge Base"),
                "category": doc["metadata"].get("category", "General"),
                "confidence": score,
                "chunk_id": doc["id"]
            })

        return results

    def delete_document_chunks(self, doc_id: str):
        """Deletes all chunks belonging to a document."""
        self.in_memory_docs = [d for d in self.in_memory_docs if d["metadata"].get("doc_id") != doc_id]
        if self.collection is not None:
            try:
                self.collection.delete(where={"doc_id": doc_id})
            except Exception as e:
                print(f"[RAGVectorStore] Error deleting doc chunks in ChromaDB: {e}")

vector_store = RAGVectorStore()
