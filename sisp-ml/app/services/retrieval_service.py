# Vector retrieval service — implemented in section 3.8
class RetrievalService:
    def __init__(self):
        self.embedding_model = None
        self.is_loaded = False

    def is_ready(self) -> bool:
        return self.is_loaded


retrieval_service = RetrievalService()