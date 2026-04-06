# Response cache service — implemented in section 5.2
from typing import Optional
import hashlib


class CacheService:
    def __init__(self):
        self._cache: dict = {}

    def get(self, key: str) -> Optional[str]:
        return self._cache.get(key)

    def set(self, key: str, value: str) -> None:
        self._cache[key] = value

    def make_key(self, text: str) -> str:
        return hashlib.md5(text.encode()).hexdigest()


cache_service = CacheService()