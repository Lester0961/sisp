import sys
import os

# Add parent directory to path so app module can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.retrieval_service import retrieval_service

def test_retrieval_service_is_ready():
    """Verify that the retrieval service has loaded the embedding model and local vector index."""
    assert retrieval_service.is_ready() is True

def test_retrieval_semantic_match():
    """Verify that searching for document requests matches document policy chunks."""
    results = retrieval_service.retrieve("How long does it take to get my TOR transcript?", limit=2)
    
    assert len(results) > 0
    # The top result should be from document_requests.txt
    assert results[0]["source"] == "document_requests.txt"
    assert results[0]["category"] == "document_request"
    assert "Transcript of Records" in results[0]["content"] or "document" in results[0]["content"].lower()
    assert isinstance(results[0]["similarity"], float)
    assert 0.0 <= results[0]["similarity"] <= 1.0

def test_retrieval_category_filtering():
    """Verify that category filtering restricts search results."""
    # Search for grades but restrict specifically to enrollment_policy (should not return grading items)
    results = retrieval_service.retrieve("What is my final grade in math?", limit=3, category="enrollment_policy")
    
    for r in results:
        assert r["category"] == "enrollment_policy"
        assert r["category"] != "grading_policy"
