import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.rag.knowledge_base import KnowledgeBase
from src.rag.embeddings import embedding_service


def test_embeddings():
    vec = embedding_service.embed(["Hello world"])
    assert vec.shape[0] == 1
    assert vec.shape[1] > 0
    print(f"[PASS] Embeddings: shape={vec.shape}")


def test_knowledge_base_chunking():
    kb = KnowledgeBase()
    text = "This is a test document. " * 100
    count = kb._chunk_and_index(text, {"source": "test"})
    assert count > 0
    assert len(kb.chunks) >= count
    print(f"[PASS] Chunking: {count} chunks created")


def test_knowledge_base_search():
    kb = KnowledgeBase()
    kb.chunks = []
    text = "Password reset instructions: go to settings and click reset password. " * 20
    kb._chunk_and_index(text, {"source": "test_faq"})

    text2 = "Billing information: subscriptions are charged monthly. " * 20
    kb._chunk_and_index(text2, {"source": "test_billing"})

    results = kb.search("how do I reset my password?", top_k=2)
    assert len(results) > 0
    print(f"[PASS] Search: {len(results)} results found")


if __name__ == "__main__":
    test_embeddings()
    test_knowledge_base_chunking()
    test_knowledge_base_search()
    print("\nAll RAG tests passed!")
