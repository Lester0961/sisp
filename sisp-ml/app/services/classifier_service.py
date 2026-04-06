# Intent classifier service — implemented in section 3.6
class ClassifierService:
    def __init__(self):
        self.model = None
        self.is_loaded = False

    def is_ready(self) -> bool:
        return self.is_loaded


classifier_service = ClassifierService()