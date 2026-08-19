from backend.rag.chunker import chunk_text
from backend.rag.vectorstore import RAGVectorStore


def test_chunker_preserves_chunk_metadata():
    chunks = chunk_text(
        "Password reset steps are in account settings.\n\n" * 80,
        {"doc_id": "password-guide", "title": "Password Guide", "source": "guide.md"},
        chunk_size=300,
        chunk_overlap=60,
    )
    assert len(chunks) > 1
    assert all(chunk["metadata"]["chunk_length"] > 0 for chunk in chunks)
    assert chunks[0]["metadata"]["chunk_id"] == "password-guide_chunk_0"


def test_fallback_retrieval_reranks_and_validates_citations(tmp_path):
    store = RAGVectorStore(persist_directory=str(tmp_path))
    store.collection = None
    store.add_chunks([
        {
            "id": "billing_1",
            "text": "Duplicate subscription charges can be refunded after transaction verification.",
            "metadata": {"chunk_id": "billing_1", "title": "Billing Refunds", "source": "billing.md", "category": "Billing"},
        },
        {
            "id": "password_1",
            "text": "Password reset links are available from account settings.",
            "metadata": {"chunk_id": "password_1", "title": "Password Reset", "source": "account.md", "category": "Account"},
        },
    ])

    results = store.search("How do I get a refund for a duplicate charge?", top_k=2)

    assert results
    assert results[0]["chunk_id"] == "billing_1"
    assert all(result["snippet"] and result["title"] and result["source"] for result in results)
    assert all(0.0 <= result["confidence"] <= 0.99 for result in results)
