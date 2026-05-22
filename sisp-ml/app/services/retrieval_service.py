import os
import joblib
import numpy as np
from sqlalchemy import text
from sentence_transformers import SentenceTransformer
from app.config import get_settings
from app.database import engine, check_db_connection

settings = get_settings()

class RetrievalService:
    def __init__(self):
        self.model = None
        self.local_index = []
        self.is_loaded = False
        self.load_model()
        self.load_local_index()

    def load_model(self):
        """Load the sentence-transformers embedding model."""
        try:
            print(f"[RETRIEVAL] Loading embedding model: {settings.embedding_model}...")
            self.model = SentenceTransformer(settings.embedding_model)
            print("[RETRIEVAL] Embedding model loaded successfully!")
        except Exception as e:
            print(f"[RETRIEVAL] [ERROR] Failed to load embedding model: {e}")

    def load_local_index(self):
        """Load the local vector index pickle file as a fallback."""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            index_path = os.path.join(base_dir, "data", "local_vector_index.pkl")
            
            if os.path.exists(index_path):
                print(f"[RETRIEVAL] Loading local vector index from: {index_path}")
                self.local_index = joblib.load(index_path)
                self.is_loaded = True
                print(f"[RETRIEVAL] Loaded {len(self.local_index)} document chunks into local index.")
            else:
                print(f"[RETRIEVAL] [WARNING] Local vector index not found at: {index_path}")
                self.local_index = []
                self.is_loaded = False
        except Exception as e:
            print(f"[RETRIEVAL] [ERROR] Failed to load local vector index: {e}")
            self.local_index = []
            self.is_loaded = False

    def is_ready(self) -> bool:
        return self.model is not None and (self.is_loaded or check_db_connection())

    def retrieve(self, query: str, limit: int = 3, category: str = None) -> list:
        """Retrieve top matching document chunks using pgvector or in-memory fallback."""
        if self.model is None:
            print("[RETRIEVAL] [ERROR] Embedding model is not loaded. Cannot retrieve.")
            return []

        # 1. Compute query embedding
        try:
            query_vector = self.model.encode(query, show_progress_bar=False)
        except Exception as e:
            print(f"[RETRIEVAL] [ERROR] Failed to encode query: {e}")
            return []

        # 2. Attempt PostgreSQL retrieval if database is connected
        db_connected = check_db_connection()
        if db_connected:
            try:
                print(f"[RETRIEVAL] Running pgvector semantic search in PostgreSQL (limit={limit}, category={category})...")
                # Convert numpy array to list
                vector_list = query_vector.tolist()
                
                # Formulate search query with optional category filtering
                query_str = """
                SELECT content, source, category, (1 - (embedding <=> :query_vector::vector)) AS similarity
                FROM "VectorEmbeddings"
                """
                params = {"query_vector": str(vector_list), "limit": limit}
                
                if category:
                    query_str += " WHERE category = :category"
                    params["category"] = category
                    
                query_str += " ORDER BY embedding <=> :query_vector::vector ASC LIMIT :limit;"
                
                results = []
                with engine.connect() as conn:
                    result = conn.execute(text(query_str), params)
                    for row in result:
                        results.append({
                            "content": row[0],
                            "source": row[1],
                            "category": row[2],
                            "similarity": float(row[3])
                        })
                
                if results:
                    print(f"[RETRIEVAL] Database search found {len(results)} matches.")
                    return results
            except Exception as e:
                print(f"[RETRIEVAL] [WARNING] pgvector query failed: {e}. Falling back to local search.")

        # 3. Local in-memory search fallback
        print(f"[RETRIEVAL] Running local in-memory semantic search (limit={limit}, category={category})...")
        if not self.local_index:
            # Try reloading the index in case it was built since startup
            self.load_local_index()
            
        if not self.local_index:
            print("[RETRIEVAL] [WARNING] Local index is empty. No documents to search.")
            return []

        matches = []
        for item in self.local_index:
            # Optional category filter
            if category and item["category"] != category:
                continue
                
            # Cosine similarity is simply the dot product since both vectors are normalized
            # sentence-transformers outputs L2-normalized embeddings (unit length = 1)
            doc_emb = item["embedding"]
            similarity = float(np.dot(query_vector, doc_emb))
            
            matches.append({
                "content": item["content"],
                "source": item["source"],
                "category": item["category"],
                "similarity": similarity
            })

        # Sort matches by similarity descending
        matches.sort(key=lambda x: x["similarity"], reverse=True)
        top_matches = matches[:limit]
        print(f"[RETRIEVAL] Local search returned {len(top_matches)} matches.")
        return top_matches

retrieval_service = RetrievalService()