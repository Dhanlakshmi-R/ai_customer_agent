from typing import List, Dict, Any
from backend.rag.vectorstore import vector_store

class KnowledgeRecommendationAgent:
    def retrieve(self, query: str, intent: str = "General", top_k: int = 3) -> List[Dict[str, Any]]:
        """Retrieves top matching support articles, FAQs, and policies from ChromaDB vector store."""
        search_query = f"{intent}: {query}"
        results = vector_store.search(query=search_query, top_k=top_k)

        # If no relevant KB matches, return empty so the UI shows an honest
        # "no matches" state rather than fabricating articles. The frontend already
        # renders an empty knowledge panel when citation.length === 0.
        return results
