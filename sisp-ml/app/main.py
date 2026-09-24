from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.config import get_settings
from app.database import check_db_connection
from app.routers import chat, classify, retrieve, feedback, admin, knowledge_base

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"[STARTING] {settings.app_name} v{settings.app_version} starting...")
    print(f"   Embedding model: {settings.embedding_model}")
    print(f"   Confidence threshold: {settings.confidence_threshold}")

    db_ok = check_db_connection()
    if db_ok:
        print("   [OK] Database connection: OK")
    else:
        print("   [WARNING] Database connection: FAILED (will retry on requests)")

    # In production the migration-managed pgvector corpus is authoritative.
    # Keep its approved file sources in sync with this release, then index only
    # new/changed/missing documents with the same FastEmbed model used by chat.
    # Local/mock mode intentionally continues using the checked-in fallback.
    if settings.require_pgvector and db_ok:
        try:
            from app.ml.sync_approved_sources import sync_approved_sources
            from app.ml.embed_documents import embed_and_index

            source_count = await asyncio.to_thread(sync_approved_sources)
            index_result = await asyncio.to_thread(embed_and_index)
            print(
                "   [KB] Approved source sync complete: "
                f"{source_count} sources; {index_result.get('indexed', 0)} indexed, "
                f"{index_result.get('failed', 0)} failed."
            )
        except Exception as exc:
            # Preserve the service's existing degraded-startup behavior while
            # making the source/index failure explicit in Render logs/health.
            print(f"   [KB] Approved source sync/index failed ({type(exc).__name__}).")

    yield

    # Shutdown
    print("[SHUTDOWN] ARIA ML Service shutting down...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Hybrid NLP and Semantic-Based Academic Advisory Chat System",
    lifespan=lifespan,
)

# CORS — allow NestJS backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://localhost:3000",
        "http://localhost:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router)
app.include_router(classify.router)
app.include_router(retrieve.router)
app.include_router(feedback.router)
app.include_router(admin.router)
app.include_router(knowledge_base.router)


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


@app.get("/health")
async def health():
    db_ok = check_db_connection()
    pgvector_ready = None
    if settings.require_pgvector:
        from app.services.retrieval_service import retrieval_service

        pgvector_ready = db_ok and retrieval_service.pgvector_index_ready()
        if not pgvector_ready:
            raise HTTPException(
                status_code=503,
                detail={
                    "status": "degraded",
                    "service": "sisp-ml",
                    "database": "connected" if db_ok else "disconnected",
                    "pgvector_index": "ready" if pgvector_ready else "unavailable",
                },
            )
    return {
        "status": "ok",
        "service": "sisp-ml",
        "version": settings.app_version,
        "database": "connected" if db_ok else "disconnected",
        "pgvector_index": "ready" if pgvector_ready else ("not_required" if pgvector_ready is None else "unavailable"),
        "embedding_model": settings.embedding_model,
        "embedding_dimension": settings.embedding_dimension,
    }
