import sys
import os
import uuid
import joblib
from sqlalchemy import text

# Add parent directory to path so app module can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.config import get_settings
from app.database import engine, check_db_connection

settings = get_settings()

def chunk_text(file_path: str) -> list:
    """Read a file and chunk it by double newlines (paragraphs)."""
    if not os.path.exists(file_path):
        print(f"[WARNING] File not found: {file_path}")
        return []
    
    with open(file_path, "r", encoding="utf-8") as f:
        text_content = f.read()
    
    # Split by double newline to get logical paragraphs/sections
    raw_paragraphs = text_content.split("\n\n")
    chunks = []
    
    # Clean and filter paragraphs
    title = ""
    for idx, para in enumerate(raw_paragraphs):
        para = para.strip()
        if not para:
            continue
        
        # Track first line as header if it looks like one
        if idx == 0 and ("REGIS MARIE" in para or "POLICY" in para):
            title = para
            continue
        
        # Prepend the title for richer chunk context if helpful
        content = f"{title}\n{para}" if title else para
        chunks.append(content)
        
    return chunks

def embed_and_index():
    # Keep the API process lightweight at startup; this dependency is only
    # needed when an authorized admin explicitly triggers re-indexing.
    from sentence_transformers import SentenceTransformer

    print("[INDEXING] Starting institutional knowledge base embedding process...")
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    kb_dir = os.path.join(base_dir, "data", "knowledge_base")
    
    policy_files = {
        "document_requests.txt": "document_request",
        "enrollment_policy.txt": "enrollment_policy",
        "grading_policy.txt": "grading_policy"
    }
    
    all_chunks = []
    for file_name, category in policy_files.items():
        file_path = os.path.join(kb_dir, file_name)
        chunks = chunk_text(file_path)
        print(f"  Parsed {len(chunks)} chunks from {file_name}")
        for chunk in chunks:
            all_chunks.append({
                "content": chunk,
                "source": file_name,
                "category": category
            })
            
    if not all_chunks:
        print("[ERROR] No chunks found. Indexing aborted.")
        return
    
    # Initialize SentenceTransformer model
    print(f"[MODEL] Loading embedding model: {settings.embedding_model}...")
    model = SentenceTransformer(settings.embedding_model)
    
    # Compute embeddings
    print(f"[MODEL] Generating embeddings for {len(all_chunks)} chunks...")
    contents = [c["content"] for c in all_chunks]
    embeddings = model.encode(contents, show_progress_bar=False)
    
    # Attach embeddings to chunks
    for i, chunk in enumerate(all_chunks):
        chunk["embedding"] = embeddings[i]
        
    # Attempt DB Insert
    db_connected = check_db_connection()
    db_success = False
    
    if db_connected:
        print("[DATABASE] DB Connection verified. Inserting embeddings...")
        try:
            # We will use raw connection/SQL execution to insert the pgvector records
            with engine.connect() as conn:
                # Clear existing embeddings to prevent duplicates
                conn.execute(text('TRUNCATE TABLE "VectorEmbeddings";'))
                
                # Insert chunks one by one
                insert_query = text("""
                INSERT INTO "VectorEmbeddings" (id, content, embedding, source, category)
                VALUES (:id, :content, :embedding, :source, :category);
                """)
                
                for chunk in all_chunks:
                    # Convert numpy array to list for pgvector compatibility
                    emb_list = chunk["embedding"].tolist()
                    conn.execute(insert_query, {
                        "id": str(uuid.uuid4()),
                        "content": chunk["content"],
                        "embedding": emb_list,
                        "source": chunk["source"],
                        "category": chunk["category"]
                    })
                
                conn.commit()
                print("[DATABASE] Successfully inserted all embeddings to PostgreSQL VectorEmbeddings table!")
                db_success = True
        except Exception as e:
            print(f"[DATABASE] [WARNING] Failed to insert into DB table: {e}")
            print("[DATABASE] Will rely on local vector index file backup.")
    else:
        print("[DATABASE] [WARNING] DB connection failed or paused. Skipping PostgreSQL insert.")
        
    # Serialize to local file index as backup/local-simulation mode source
    local_index_path = os.path.join(base_dir, "data", "local_vector_index.pkl")
    print(f"[LOCAL] Saving index to local file: {local_index_path}...")
    try:
        # Create data structure without numpy object arrays if we want it super clean,
        # but joblib handles numpy arrays perfectly.
        local_data = []
        for c in all_chunks:
            local_data.append({
                "content": c["content"],
                "source": c["source"],
                "category": c["category"],
                "embedding": c["embedding"]  # numpy float32 array
            })
            
        joblib.dump(local_data, local_index_path)
        print("[LOCAL] Successfully created local vector index file!")
    except Exception as e:
        print(f"[LOCAL] [ERROR] Failed to save local vector index file: {e}")
        
    print(f"[SUMMARY] Indexing completed. DB Online: {db_success}, Local Index Saved: True")

if __name__ == "__main__":
    embed_and_index()
