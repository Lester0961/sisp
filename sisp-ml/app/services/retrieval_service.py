import os
import re
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.pipeline import FeatureUnion
from sqlalchemy import text
from app.config import get_settings
from app.database import engine, check_db_connection
from app.approved_sources import APPROVED_STATIC_SOURCES

settings = get_settings()

STUDENT_SERVICES_CATEGORY = "student_services_faq"
STUDENT_SERVICES_QUERY_CATEGORIES = frozenset({
    "enrollment_policy",
    "payment_policy",
    "grading_policy",
    "document_request",
    "document_requests",
    "examination_permit_policy",
})

class RetrievalService:
    def __init__(self):
        self.model = None
        self.local_index = []
        self.text_documents = []
        self.is_loaded = False
        self.model_load_attempted = False
        # Load the small local index synchronously, but defer the heavyweight
        # sentence-transformer import/model download until after the API binds.
        self.load_local_index()
        self.load_text_documents()

    def load_model(self):
        """Load the sentence-transformers embedding model."""
        if self.model_load_attempted:
            return
        self.model_load_attempted = True
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
        """Load explicitly approved factual sources for local fallback.

        Unapproved policy files remain unavailable to ARIA until durable
        approval metadata is recorded.
        """
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            kb_dir = os.path.join(base_dir, "data", "knowledge_base")
            category_by_filename = {
                "document_requests.txt": "document_request",
                "enrollment_interview_guidance.txt": "enrollment_policy",
                "enrollment_policy.txt": "enrollment_policy",
                "grading_policy.txt": "grading_policy",
                "official_advice.txt": "official_advice",
                "program_catalog.txt": "programs_curriculum",
                "student_services_faq_2026.txt": STUDENT_SERVICES_CATEGORY,
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
                        "category": category_by_filename.get(
                            filename,
                            "programs_curriculum" if filename.startswith("curriculum_") else filename.removesuffix(".txt"),
                        ),
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
        if not settings.require_pgvector and (
            category in {None, "programs_curriculum"}
            and self._is_program_catalog_query(query)
        ):
            catalog_chunks = self.retrieve_source("program_catalog.txt")
            if catalog_chunks:
                return self._hybrid_rank(query, catalog_chunks, limit)

        if settings.require_pgvector:
            if not check_db_connection():
                print("[RETRIEVAL] pgvector is required but the database is unavailable; refusing local fallback.")
                return []
            if self.model is None:
                self.load_model()
            if self.model is None:
                print("[RETRIEVAL] pgvector is required but the embedding model is unavailable.")
                return []

        if (
            self.model is None
            and not self.model_load_attempted
            and (self.local_index or self.text_documents)
            and (category is None or category == "programs_curriculum")
        ):
            self.load_model()

        if self.model is None:
            # Keep a scikit-learn sparse retriever available during local
            # development and on deployments where sentence embeddings are
            # unavailable. The same reranker combines it with dense scores
            # whenever an embedding is present.
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
                candidate_limit = max(limit * 5, 15)
                print(f"[RETRIEVAL] Running pgvector hybrid search (limit={candidate_limit}, category={category})...")
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
                    "limit": candidate_limit,
                    "embedding_model": settings.embedding_model,
                }
                if category:
                    params["category"] = category
                    if category in STUDENT_SERVICES_QUERY_CATEGORIES:
                        query_str += " AND (COALESCE(chunk.category, document.category) = :category"
                        query_str += " OR COALESCE(chunk.category, document.category) = :student_services_category)"
                        params["student_services_category"] = STUDENT_SERVICES_CATEGORY
                    else:
                        query_str += " AND COALESCE(chunk.category, document.category) = :category"
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
                    return self._above_threshold(self._hybrid_rank(query, results, limit))
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

        # 3. Local hybrid search over the same approved static/document corpus.
        print(f"[RETRIEVAL] Running local hybrid search (limit={limit}, category={category})...")
        if not self.local_index:
            # Try reloading the index in case it was built since startup
            self.load_local_index()

        candidates = []
        seen_content = set()
        for item in self.local_index + self.text_documents:
            if not self._category_matches(item.get("category"), category):
                continue
            key = re.sub(r"\W+", " ", item.get("content", "").casefold()).strip()
            if not key or key in seen_content:
                continue
            seen_content.add(key)
            candidate = {
                "content": item["content"],
                "source": item.get("source", "institutional source"),
                "category": item.get("category", "policy"),
                "embedding": item.get("embedding"),
            }
            if candidate["embedding"] is not None:
                candidate["similarity"] = float(np.dot(query_vector, candidate["embedding"]))
            candidates.append(candidate)

        if not candidates:
            print("[RETRIEVAL] [WARNING] No approved local documents are available to search.")
            return []
        return self._above_threshold(self._hybrid_rank(query, candidates, limit, query_vector))

    def retrieve_source(self, source: str) -> list[dict]:
        """Return every chunk for one explicitly approved source, in source order.

        A named program such as BSCS is a precise corpus selector. Returning its
        full sequence avoids letting a generic catalog paragraph or a different
        program win a semantic top-k search for a multilingual question.
        """
        if not self._is_approved_static_source(source):
            return []

        if settings.require_pgvector:
            if not check_db_connection():
                print("[RETRIEVAL] pgvector is required but the database is unavailable; refusing source fallback.")
                return []
            try:
                with engine.connect() as conn:
                    rows = conn.execute(text("""
                        SELECT chunk.content,
                               document.filename,
                               COALESCE(chunk.category, document.category)
                        FROM knowledge_chunks AS chunk
                        JOIN knowledge_documents AS document ON document.id = chunk.document_id
                        WHERE document.is_active = TRUE
                          AND document.filename = :source
                        ORDER BY chunk.chunk_index ASC
                    """), {"source": os.path.basename(source)}).fetchall()
                return [
                    {"content": row[0], "source": row[1], "category": row[2] or "programs_curriculum", "similarity": 1.0}
                    for row in rows
                ]
            except Exception as exc:
                print(f"[RETRIEVAL] Exact approved-source lookup failed: {exc}")
                return []

        if check_db_connection():
            try:
                with engine.connect() as conn:
                    rows = conn.execute(text("""
                        SELECT chunk.content,
                               document.filename,
                               COALESCE(chunk.category, document.category)
                        FROM knowledge_chunks AS chunk
                        JOIN knowledge_documents AS document ON document.id = chunk.document_id
                        WHERE document.is_active = TRUE
                          AND document.filename = :source
                        ORDER BY chunk.chunk_index ASC
                    """), {"source": os.path.basename(source)}).fetchall()
                if rows:
                    return [
                        {"content": row[0], "source": row[1], "category": row[2] or "programs_curriculum", "similarity": 1.0}
                        for row in rows
                    ]
            except Exception as exc:
                print(f"[RETRIEVAL] Exact database source lookup failed; trying approved local files: {exc}")

        if not self.text_documents:
            self.load_text_documents()
        return [
            {
                "content": item["content"],
                "source": item["source"],
                "category": item.get("category", "programs_curriculum"),
                "similarity": 1.0,
            }
            for item in self.text_documents
            if os.path.basename(item.get("source", "")).casefold() == os.path.basename(source).casefold()
        ]

    @staticmethod
    def _above_threshold(matches: list[dict]) -> list[dict]:
        threshold = settings.retrieval_similarity_threshold
        return [match for match in matches if float(match.get("similarity", 0.0)) >= threshold]

    @staticmethod
    def _category_matches(item_category: str | None, category: str | None) -> bool:
        if category is None or item_category == category:
            return True
        return (
            category in STUDENT_SERVICES_QUERY_CATEGORIES
            and item_category == STUDENT_SERVICES_CATEGORY
        )

    def _lexical_retrieve(self, query: str, limit: int, category: str | None) -> list:
        if not self.local_index and not self.is_loaded:
            self.load_local_index()
        if not self.text_documents:
            self.load_text_documents()
        if not self.local_index and not self.text_documents:
            return []

        candidates = []
        seen_content = set()
        for item in self.local_index + self.text_documents:
            if not self._category_matches(item.get("category"), category):
                continue
            key = re.sub(r"\W+", " ", item.get("content", "").casefold()).strip()
            if not key or key in seen_content:
                continue
            seen_content.add(key)
            candidates.append({
                "content": item["content"],
                "source": item.get("source", "institutional source"),
                "category": item.get("category", "policy"),
            })
        return self._hybrid_rank(query, candidates, limit)

    @staticmethod
    def _expanded_query(query: str) -> str:
        normalized = query.casefold()
        expansions = []

        def has_phrase(terms: tuple[str, ...]) -> bool:
            for term in terms:
                phrase_pattern = r"[\s-]+".join(
                    re.escape(part) for part in term.casefold().split()
                )
                if re.search(rf"(?<!\w){phrase_pattern}(?!\w)", normalized):
                    return True
            return False

        has_enrollment_cue = bool(
            re.search(r"(?<!\w)enroll(?:ment|ing|ed|s)?(?!\w)", normalized)
            or re.search(r"(?<!\w)enrol(?:ment|ling|ed|s)?(?!\w)", normalized)
            or has_phrase((
                "registration", "register", "registering", "continuing student",
                "continuing students", "continue my studies", "continuing studies",
                "magpatuloy", "magpapatuloy", "magpadayon", "magpapadayon",
                "magapadayon", "agtultuloy", "mag enroll", "mag-enroll", "pag enroll",
                "pag-enroll", "magpatala", "pagpapatala", "ag-enroll",
                "panag-enroll", "pagpalista", "matrikula", "semestre",
                "semester", "magpadayon", "magpapadayon", "magapadayon",
                "sunod nga term", "sunod nga semester", "sumaruno a term",
            ))
        )
        if has_enrollment_cue:
            # The answer corpus is English while student questions may be
            # code-switched or regional. Add canonical concepts to the search
            # representation; retain the original wording for the LLM.
            expansions.append(
                "continuing-student enrollment first visit Treasury to clear any previous "
                "outstanding balance then proceed to Admissions for enrollment; dates, tuition "
                "amount and complete document checklist are not specified"
            )
        if any(term in normalized for term in ("returning", "return student", "bumalik", "pagbalik", "nagbalik")):
            expansions.append(
                "returning after a break Treasury clearance evaluate previously taken subjects Admissions"
            )
        if any(term in normalized for term in ("transferee", "transfer student", "lumipat", "transfer")):
            expansions.append(
                "transferee documents Transcript of Records Certificate of Good Moral Character Honorable Dismissal"
            )
        amount_cues = (
            "how much", "magkano", "pila", "pira", "mano", "tagpira", "tag pira",
            "amount", "kantidad", "how many pesos", "how much does",
        )
        asks_amount = has_phrase(amount_cues)
        payment_instruction_cues = (
            "where to pay", "where do i pay", "where can i pay", "where should i pay",
            "how to pay", "how do i pay", "how can i pay", "how should i pay",
            "pay online", "payment method", "payment methods", "payment option",
            "payment options", "online payment", "payment process", "proof of payment",
            "bank transfer", "gcash", "pnb", "deposit", "saan magbayad",
            "saan ako magbabayad", "saan ko babayaran", "paano magbayad",
            "paano ako magbayad", "magbayad", "magbabayad", "asa mobayad",
            "asa ko mobayad", "unsaon pagbayad", "mobayad", "makakabayad",
            "pagbayad", "agbayad", "diin magbayad", "diin ti agbayad",
            "sadino ti agbayad", "hain magbayad", "hain ako magbayad",
        )
        if has_phrase(payment_instruction_cues) and (
            not asks_amount or has_phrase(("payment method", "payment methods", "gcash", "pnb", "bank transfer", "deposit"))
        ):
            expansions.append(
                "online payment methods GCash bank transfer deposit through PNB proof of payment "
                "Treasury Office; bank transfer may be used when payment exceeds GCash limit"
            )
        if any(term in normalized for term in ("late enrollment", "late enrol", "nahuli", "huli na")):
            expansions.append("late enrollment Registrar approval subjects already underway")
        if re.search(r"(?<!\w)inc(?!\w)|incomplete", normalized):
            expansions.append(
                "INC form processing procedure Treasury payment official receipt Dean office "
                "compliance signature Records Department"
            )
        if any(term in normalized for term in ("orientation", "orientasyon", "oryentasyon", "oriyentasyon")):
            expansions.append(
                "Academic Department Announcement 4th Year orientation 2nd and 3rd Year student schedule"
            )
        if any(term in normalized for term in ("add/drop", "add and drop", "adding", "dropping", "dagdag", "bawas")):
            expansions.append("adding or dropping units Admissions then Treasury")
        if any(term in normalized for term in ("subject", "subjects", "kurso", "asignatura", "aralin")):
            expansions.append("course courses curriculum program")
        if "bscs" in normalized or "computer science" in normalized:
            expansions.append("computer science")
        if "bsc r im" in normalized or "bscrim" in normalized or "criminology" in normalized:
            expansions.append("criminology")
        if re.search(r"\btor\b|transcript", normalized):
            expansions.append("transcript of records PHP 500 per page")
        return " ".join([query, *expansions])

    @staticmethod
    def _is_program_catalog_query(query: str) -> bool:
        normalized = re.sub(r"\s+", " ", (query or "").casefold()).strip()
        program_terms = ("program", "programs", "degree", "degrees", "course", "courses", "kurso")
        catalog_terms = ("catalog", "offer", "offered", "available", "what programs", "anong programa")
        return any(term in normalized for term in program_terms) and any(
            term in normalized for term in catalog_terms
        )

    def _hybrid_rank(
        self,
        query: str,
        candidates: list[dict],
        limit: int,
        query_vector=None,
    ) -> list[dict]:
        """Fuse sparse TF-IDF and optional dense scores over approved candidates."""
        if not candidates:
            return []

        documents = []
        for item in candidates:
            content = item.get("content", "")
            question = next(
                (line.strip() for line in content.splitlines() if line.strip().startswith("Q:")),
                None,
            )
            # FAQ records contain much longer answers and provenance than
            # questions. Repeat the question once in sparse search text so an
            # exact query is not diluted by the answer's extra terms.
            documents.append(f"{content}\n{question}" if question else content)
        sparse_model = FeatureUnion(
            [
                (
                    "word",
                    TfidfVectorizer(
                        ngram_range=(1, 2),
                        strip_accents="unicode",
                        sublinear_tf=True,
                        stop_words=[
                            "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does",
                            "for", "from", "how", "i", "in", "is", "it", "my", "of", "on", "or",
                            "the", "to", "what", "when", "where", "who", "with", "ang", "ano", "ay",
                            "ba", "ikaw", "ko", "mga", "mo", "na", "ng", "sa", "si", "sila", "yung",
                        ],
                    ),
                ),
                (
                    "char",
                    TfidfVectorizer(
                        analyzer="char_wb",
                        ngram_range=(3, 5),
                        strip_accents="unicode",
                        sublinear_tf=True,
                    ),
                ),
            ],
            transformer_weights={"word": 1.0, "char": 0.55},
        )
        try:
            document_vectors = sparse_model.fit_transform(documents)
            query_vectors_sparse = sparse_model.transform([query, self._expanded_query(query)])
            original_scores = cosine_similarity(
                query_vectors_sparse[0:1], document_vectors
            ).ravel()
            expanded_scores = cosine_similarity(
                query_vectors_sparse[1:2], document_vectors
            ).ravel()
            # Keep the user's original wording in the ranking signal. A broad
            # concept expansion helps dialects and paraphrases, but must not
            # swamp an exact FAQ question such as the INC or Special Exam fee
            # instructions.
            lexical_scores = np.maximum(original_scores, expanded_scores)
        except ValueError as exc:
            print(f"[RETRIEVAL] Sparse ranker could not vectorize candidates: {exc}")
            lexical_scores = np.zeros(len(candidates), dtype=float)

        ranked = []
        for index, item in enumerate(candidates):
            lexical = float(lexical_scores[index])
            dense = item.get("similarity")
            if query_vector is not None and item.get("embedding") is not None:
                dense = float(np.dot(query_vector, item["embedding"]))
            if dense is None:
                score = lexical
            else:
                dense = max(0.0, min(1.0, float(dense)))
                fused_score = 0.6 * dense + 0.4 * lexical
                # pgvector already supplies a query-to-document cosine score.
                # Sparse reranking can improve ordering, but must not turn a
                # vector match above the configured threshold into a rejection.
                score = max(dense, fused_score) if query_vector is None and item.get("similarity") is not None else fused_score
            ranked.append({
                "content": item.get("content", ""),
                "source": item.get("source", "institutional source"),
                "category": item.get("category", "policy"),
                "similarity": float(score),
            })

        ranked.sort(key=lambda item: item["similarity"], reverse=True)
        return ranked[:limit]

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
