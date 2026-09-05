class ProviderError(RuntimeError):
    def __init__(self, provider: str, reason: str, retryable: bool = True) -> None:
        super().__init__(reason)
        self.provider = provider
        self.reason = reason
        self.retryable = retryable


class AllProvidersFailed(RuntimeError):
    def __init__(self, attempted: list[str]) -> None:
        super().__init__("All configured LLM providers are unavailable")
        self.attempted = attempted
