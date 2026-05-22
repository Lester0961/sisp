import hashlib
import os
from typing import Optional

class CacheService:
    def __init__(self):
        self.redis_client = None
        self.local_cache = {}
        self.is_redis_active = False

        # Attempt to dynamically import and connect to Upstash Redis
        try:
            import redis
            # Check for REDIS_URL in environment variables
            redis_url = os.getenv("REDIS_URL") or os.getenv("UPSTASH_REDIS_URL")
            if redis_url:
                print(f"[CACHE] Attempting connection to Redis URL...")
                self.redis_client = redis.Redis.from_url(redis_url, socket_timeout=2.0)
                # Test connection (ping)
                self.redis_client.ping()
                self.is_redis_active = True
                print("[CACHE] [OK] Redis prompt caching service active.")
            else:
                print("[CACHE] No Redis URL configured. Falling back to local in-memory dict cache.")
        except ImportError:
            print("[CACHE] redis module not installed. Falling back to local in-memory dict cache.")
        except Exception as e:
            print(f"[CACHE] Redis connection failed: {e}. Gracefully falling back to local in-memory dict cache.")
            self.is_redis_active = False

    def get(self, key: str) -> Optional[str]:
        """Fetch prompt response from Redis or local in-memory cache."""
        if self.is_redis_active and self.redis_client:
            try:
                val = self.redis_client.get(key)
                if val:
                    return val.decode("utf-8")
            except Exception as e:
                print(f"[CACHE] Redis read error: {e}")
        
        # Local fallback
        return self.local_cache.get(key)

    def set(self, key: str, value: str, ttl_seconds: int = 3600) -> None:
        """Cache prompt response in Redis with TTL or in local dict cache."""
        if self.is_redis_active and self.redis_client:
            try:
                self.redis_client.setex(key, ttl_seconds, value)
                return
            except Exception as e:
                print(f"[CACHE] Redis write error: {e}")
        
        # Local fallback
        self.local_cache[key] = value

    def make_key(self, text: str) -> str:
        """Hash combined prompt sequences using MD5."""
        return hashlib.md5(text.encode("utf-8")).hexdigest()

cache_service = CacheService()