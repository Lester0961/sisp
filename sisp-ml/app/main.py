from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.database import check_db_connection
from app.routers import chat, classify, retrieve, feedback, admin

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 {settings.app_name} v{settings.app_version} starting...")
    print(f"   Embedding model: {settings.embedding_model}")
    print(f"   Confidence threshold: {settings.confidence_threshold}")

    db_ok = check_db_connection()
    if db_ok:
        print("   ✅ Database connection: OK")
    else:
        print("   ⚠️  Database connection: FAILED (will retry on requests)")

    yield

    # Shutdown
    print("👋 ARIA ML Service shutting down...")


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
    return {
        "status": "ok",
        "service": "sisp-ml",
        "version": settings.app_version,
        "database": "connected" if db_ok else "disconnected",
        "embedding_model": settings.embedding_model,
        "embedding_dimension": settings.embedding_dimension,
    }