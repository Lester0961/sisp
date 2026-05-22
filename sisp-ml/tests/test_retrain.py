import sys
import os

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.cache_service import cache_service
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_cache_service_hashes_and_stores():
    """Verify that CacheService hashes keys and retains/reads cached sequences correctly."""
    prompt = "Test advisory prompt cache sequence"
    key = cache_service.make_key(prompt)
    
    # Assert MD5 hash length (32 chars hex)
    assert len(key) == 32
    
    # Store and retrieve
    cache_service.set(key, "cached_aria_response_123")
    cached_val = cache_service.get(key)
    
    assert cached_val == "cached_aria_response_123"

def test_retrain_endpoint_unauthorized():
    """Verify that POST /admin/retrain returns 401 if X-ML-Secret header is absent or invalid."""
    response = client.post("/admin/retrain")
    assert response.status_code == 401
    
    response = client.post("/admin/retrain", headers={"X-ML-Secret": "wrong_secret"})
    assert response.status_code == 401

def test_retrain_endpoint_success():
    """Verify that POST /admin/retrain returns 202 Accepted when authorized."""
    response = client.post(
        "/admin/retrain",
        headers={"X-ML-Secret": "supersecret_retrain_token"}
    )
    assert response.status_code == 202
    assert response.json()["status"] == "accepted"
