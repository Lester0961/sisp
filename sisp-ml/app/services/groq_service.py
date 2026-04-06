# Groq LLM service — implemented in section 3.9
class GroqService:
    def __init__(self):
        self.client = None
        self.is_configured = False

    def is_ready(self) -> bool:
        return self.is_configured


groq_service = GroqService()