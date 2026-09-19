import os
import re
import joblib
import numpy as np
from sqlalchemy import text
from app.config import get_settings
from app.database import engine, check_db_connection
from app.approved_sources import APPROVED_STATIC_SOURCES

settings = get_settings()

class RetrievalService:
    def __init__(self):
        self.model = None
        self.local_index = []
        self.text_documents = []
        self.is_loaded = False
        # Load the small local index synchronously, but defer the heavyweight
        # sentence-transformer import/model download until after the API binds.
        self.load_local_index()
        self.load_text_documents()

    def load_model(self):
        """Load the sentence-transformers embedding model."""
        try:
            from sentence_transformers import SentenceTransformer

            print(f"[RETRIEVAL] Loading embedding model: {settings.embedding_model}...")
            self.model = SentenceTransformer(settings.embedding_model)
            if self.text_documents:
                fresh_documents = [item for item in self.text_documents if "embedding" not in item]
                if fresh_documents:
                    vectors = self.model.encode(
                        [item["content"] for item in fresh_documents],
                        show_progress_bar=False,
                        normalize_embeddings=True,
                    )
                    for item, vector in zip(fresh_documents, vectors):
                        item["embedding"] = vector
                    existing_content = {
                        re.sub(r"\W+", " ", item.get("content", "").casefold()).strip()
                        for item in self.local_index
                    }
                    self.local_index.extend(
                        item for item in fresh_documents
                        if re.sub(r"\W+", " ", item.get("content", "").casefold()).strip()
                        not in existing_content
                    )
            print("[RETRIEVAL] Embedding model loaded successfully!")
        except Exception as e:
            print(f"[RETRIEVAL] [ERROR] Failed to load embedding model: {e}")

    def load_text_documents(self):
        """Load explicitly verified curriculum sources for local fallback.

        Other local policy files lack verifiable approval metadata and may
        conflict with recorded institutional decisions. They remain unavailable
        to ARIA until Phase 11 stores approved content.
        """
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            kb_dir = os.path.join(base_dir, "data", "knowledge_base")
            category_by_filename = {
                "document_requests.txt": "document_request",
                "enrollment_policy.txt": "enrollment_policy",
                "grading_policy.txt": "grading_policy",
                "official_advice.txt": "official_advice",
                "program_catalog.txt": "programs_curriculum",
            }
            documents = []
            if not os.path.isdir(kb_dir):
                self.text_documents = []
                return
            for filename in sorted(os.listdir(kb_dir)):
                if not self._is_approved_static_source(filename):
                    continue
                with open(os.path.join(kb_dir, filename), "r", encoding="utf-8") as handle:
                    paragraphs = [paragraph.strip() for paragraph in handle.read().split("\n\n") if paragraph.strip()]
                for paragraph in paragraphs:
                    documents.append({
                        "content": paragraph,
                        "source": filename,
                        "category": category_by_filename.get(filename, filename.removesuffix(".txt")),
                    })
            self.text_documents = documents
            print(f"[RETRIEVAL] Loaded {len(documents)} verified static source chunks for local fallback.")
        except Exception as exc:
            print(f"[RETRIEVAL] [WARNING] Failed to load text sources: {exc}")
            self.text_documents = []

    def load_local_index(self):
        """Load the local vector index pickle file as a fallback."""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            index_path = os.path.join(base_dir, "data", "local_vector_index.pkl")
            
            if os.path.exists(index_path):
                print(f"[RETRIEVAL] Loading local vector index from: {index_path}")
                loaded_index = joblib.load(index_path)
                self.local_index = [
                    item for item in loaded_index
                    if self._is_approved_static_source(item.get("source", ""))
                ]
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
        if settings.require_pgvector:
            return self.model is not None and self.pgvector_index_ready()
        return bool(self.local_index or self.text_documents) or (self.model is not None and check_db_connection())

    @staticmethod
    def pgvector_index_ready() -> bool:
        if engine is None or not check_db_connection():
            return False
        try:
            with engine.connect() as conn:
                row = conn.execute(text("""
                    SELECT 1
                    FROM knowledge_chunks AS chunk
                    JOIN knowledge_documents AS document ON document.id = chunk.document_id
                    WHERE document.is_active = TRUE AND chunk.embedding IS NOT NULL
                      AND chunk.embedding_model = :embedding_model
                    LIMIT 1
                """), {"embedding_model": settings.embedding_model}).first()
            return row is not None
        except Exception as exc:
            print(f"[RETRIEVAL] pgvector index health check failed: {exc}")
            return False

    def retrieve(self, query: str, limit: int = 3, category: str = None) -> list:
        """Retrieve top matching document chunks using pgvector or in-memory fallback."""
        if settings.require_pgvector:
            if not check_db_connection():
                print("[RETRIEVAL] pgvector is required but the database is unavailable; refusing local fallback.")
                return []
            if self.model is None:
                self.load_model()
            if self.model is None:
                print("[RETRIEVAL] pgvector is required but the embedding model is unavailable.")
                return []

        if self.model is None:
            # The API remains useful while the optional embedding model warms
            # up (and on small deployments where it cannot be loaded). This is
            # a deterministic lexical fallback over the same approved index.
            return self._above_threshold(self._lexical_retrieve(query, limit, category))

        # 1. Compute query embedding
        try:
            query_vector = self.model.encode(
                query,
                show_progress_bar=False,
                normalize_embeddings=True,
            )
        except Exception as e:
            print(f"[RETRIEVAL] [ERROR] Failed to encode query: {e}")
            return []

        # 2. Attempt the migration-managed Supabase pgvector path.
        db_connected = check_db_connection()
        if db_connected:
            try:
                print(f"[RETRIEVAL] Running pgvector semantic search in PostgreSQL (limit={limit}, category={category})...")
                vector_list = query_vector.tolist()
                query_str = """
                SELECT chunk.content,
                       document.filename AS source,
                       COALESCE(chunk.category, document.category) AS category,
                       (1 - (chunk.embedding <=> CAST(:query_vector AS vector))) AS similarity
                FROM knowledge_chunks AS chunk
                JOIN knowledge_documents AS document ON document.id = chunk.document_id
                WHERE document.is_active = TRUE
                  AND chunk.embedding IS NOT NULL
                  AND chunk.embedding_model = :embedding_model
                """
                params = {
                    "query_vector": str(vector_list),
                    "limit": limit,
                    "embedding_model": settings.embedding_model,
                }
                if category:
                    query_str += " AND COALESCE(chunk.category, document.category) = :category"
                    params["category"] = category
                query_str += " ORDER BY chunk.embedding <=> CAST(:query_vector AS vector) ASC LIMIT :limit;"

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
                    return self._above_threshold(results)
                if settings.require_pgvector:
                    print("[RETRIEVAL] pgvector returned no indexed matches; refusing local fallback.")
                    return []
            except Exception as e:
                print(f"[RETRIEVAL] [WARNING] pgvector query failed: {e}.")
                if settings.require_pgvector:
                    return []

        elif settings.require_pgvector:
            print("[RETRIEVAL] pgvector is required but the database is unavailable; refusing local fallback.")
            return []

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
        return self._above_threshold(top_matches)

    @staticmethod
    def _above_threshold(matches: list[dict]) -> list[dict]:
        threshold = settings.retrieval_similarity_threshold
        return [match for match in matches if float(match.get("similarity", 0.0)) >= threshold]

    def _lexical_retrieve(self, query: str, limit: int, category: str | None) -> list:
        if not self.local_index and not self.is_loaded:
            self.load_local_index()
        if not self.text_documents:
            self.load_text_documents()
        if not self.local_index and not self.text_documents:
            return []

        stopwords = {
            "a", "an", "and", "are", "can", "do", "does", "for", "get", "how", "i", "in",
            "is", "it", "my", "of", "or", "the", "to", "what", "when", "where", "who", "with",
        }
        query_terms = {
            self._normalize_term(term)
            for term in re.findall(r"[a-z0-9']+", query.casefold())
            if term not in stopwords
        }
        if not query_terms:
            return []

        matches = []
        indexed_content = {
            re.sub(r"\W+", " ", item.get("content", "").casefold()).strip()
            for item in self.local_index
        }
        lexical_documents = self.local_index + [
            item for item in self.text_documents
            if re.sub(r"\W+", " ", item.get("content", "").casefold()).strip() not in indexed_content
        ]
        for item in lexical_documents:
            if category and item.get("category") != category:
                continue
            content_terms = {
                self._normalize_term(term)
                for term in re.findall(r"[a-z0-9']+", item.get("content", "").casefold())
            }
            overlap = len(query_terms & content_terms)
            if not overlap:
                continue
            similarity = overlap / max(len(query_terms), 1)
            matches.append({
                "content": item["content"],
                "source": item["source"],
                "category": item["category"],
                "similarity": float(similarity),
            })

        matches.sort(key=lambda x: x["similarity"], reverse=True)
        return self._above_threshold(matches[:limit])

    @staticmethod
    def _normalize_term(term: str) -> str:
        if len(term) > 4 and term.endswith("ies"):
            return term[:-3] + "y"
        if len(term) > 4 and term.endswith(("ses", "xes", "zes", "ches", "shes")):
            return term[:-2]
        if len(term) > 4 and term.endswith("s") and not term.endswith("ss"):
            return term[:-1]
        return term

    @staticmethod
    def _is_approved_static_source(source: str) -> bool:
        filename = os.path.basename(source).casefold()
        return filename in {approved.casefold() for approved in APPROVED_STATIC_SOURCES}

retrieval_service = RetrievalService()
