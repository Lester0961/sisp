import sys
import os

# Add parent directory to path so app module can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.classifier_service import classifier_service

def test_classifier_is_loaded():
    """Verify that the intent classifier model loaded successfully."""
    # Attempt loading in case it wasn't pre-loaded
    if not classifier_service.is_ready():
        classifier_service.load_model()
    assert classifier_service.is_ready() is True

def test_grade_inquiry_classification():
    """Verify that grade queries are classified as grade_inquiry."""
    result = classifier_service.classify("What is my final grade in math?")
    assert result["intent"] == "grade_inquiry"
    assert result["confidence"] > 0.4
    assert isinstance(result["escalate"], bool)

def test_document_request_classification():
    """Verify that document queries are classified as document_request."""
    result = classifier_service.classify("How can I request my Transcript of Records or diploma?")
    assert result["intent"] == "document_request"
    assert result["confidence"] > 0.4

def test_low_confidence_escalation():
    """Verify that nonsense or ambiguous inputs trigger escalation."""
    # A completely random nonsense query should yield very low confidence across our 5 structured intents
    result = classifier_service.classify("pineapple spaceship telephone color blue")
    # Low confidence should trigger the escalate flag
    assert result["escalate"] is True
