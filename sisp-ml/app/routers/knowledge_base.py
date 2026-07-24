import os
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from app.config import get_settings
from app.ml.embed_documents import embed_and_index

router = APIRouter(prefix="/kb", tags=["knowledge_base"])

settings = get_settings()

KB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "knowledge_base")

# Category mapping for known files
KNOWN_CATEGORIES = {
    "document_requests.txt": "document_request",
    "enrollment_policy.txt": "enrollment_policy",
    "grading_policy.txt": "grading_policy",
}


def verify_secret(x_ml_secret: Optional[str]):
    if x_ml_secret != settings.ml_secret_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ML Secret Header token."
        )


class DocumentCreate(BaseModel):
    filename: str
    content: str
    category: str


class DocumentUpdate(BaseModel):
    content: str


@router.get("/documents")
async def list_documents(x_ml_secret: str = Header(None)):
    """List all knowledge base documents with their content and metadata."""
    verify_secret(x_ml_secret)

    documents = []
    if not os.path.exists(KB_DIR):
        return {"documents": []}

    for filename in sorted(os.listdir(KB_DIR)):
        if not filename.endswith(".txt"):
            continue
        filepath = os.path.join(KB_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            documents.append({
                "filename": filename,
                "category": KNOWN_CATEGORIES.get(filename, filename.replace(".txt", "").replace("_", " ")),
                "content": content,
                "sizeBytes": os.path.getsize(filepath),
                "lastModified": os.path.getmtime(filepath),
            })
        except Exception as e:
            documents.append({
                "filename": filename,
                "category": "unknown",
                "content": f"[Error reading file: {str(e)}]",
                "sizeBytes": 0,
                "lastModified": 0,
            })

    return {"documents": documents}


@router.get("/documents/{filename}")
async def get_document(filename: str, x_ml_secret: str = Header(None)):
    """Get the content of a specific knowledge base document."""
    verify_secret(x_ml_secret)

    filepath = os.path.join(KB_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Document '{filename}' not found.")

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    return {
        "filename": filename,
        "category": KNOWN_CATEGORIES.get(filename, filename.replace(".txt", "").replace("_", " ")),
        "content": content,
    }


@router.put("/documents/{filename}")
async def update_document(filename: str, body: DocumentUpdate, x_ml_secret: str = Header(None)):
    """Update the content of an existing knowledge base document."""
    verify_secret(x_ml_secret)

    filepath = os.path.join(KB_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Document '{filename}' not found.")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(body.content)

    return {"message": f"Document '{filename}' updated successfully.", "filename": filename}


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def create_document(body: DocumentCreate, x_ml_secret: str = Header(None)):
    """Create a new knowledge base document."""
    verify_secret(x_ml_secret)

    # Ensure filename ends with .txt
    filename = body.filename if body.filename.endswith(".txt") else f"{body.filename}.txt"
    filepath = os.path.join(KB_DIR, filename)

    if os.path.exists(filepath):
        raise HTTPException(status_code=409, detail=f"Document '{filename}' already exists.")

    # Register category
    KNOWN_CATEGORIES[filename] = body.category

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(body.content)

    return {"message": f"Document '{filename}' created successfully.", "filename": filename}


@router.delete("/documents/{filename}")
async def delete_document(filename: str, x_ml_secret: str = Header(None)):
    """Delete a knowledge base document."""
    verify_secret(x_ml_secret)

    filepath = os.path.join(KB_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Document '{filename}' not found.")

    os.remove(filepath)
    return {"message": f"Document '{filename}' deleted successfully."}


def run_reindex_task():
    try:
        print("[BG_TASK] Starting knowledge base re-indexing...")
        embed_and_index()
        print("[BG_TASK] Knowledge base re-indexing completed successfully.")
    except Exception as e:
        print(f"[BG_TASK] Re-indexing task failed: {e}")


@router.post("/reindex", status_code=status.HTTP_202_ACCEPTED)
async def reindex_embeddings(background_tasks: BackgroundTasks, x_ml_secret: str = Header(None)):
    """Trigger re-embedding and re-indexing of all knowledge base documents."""
    verify_secret(x_ml_secret)

    background_tasks.add_task(run_reindex_task)
    return {
        "status": "accepted",
        "message": "Re-indexing task scheduled in background. Embeddings will be updated shortly."
    }
