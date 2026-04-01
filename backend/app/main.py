import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import fhir, hl7, ai, care_gaps
from app.services.fhir_client import fhir_client
from app.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("CareSync API starting up…")

    # Connect to Turso (or :memory: SQLite fallback) and create tables
    await init_db()

    logger.info("CareSync API is ready.")
    yield

    # Shutdown: close persistent httpx client
    logger.info("CareSync API shutting down…")
    await fhir_client.close()
    logger.info("CareSync API shut down cleanly.")


app = FastAPI(
    title="CareSync Healthcare Intelligence API",
    description=(
        "Backend API for CareSync — a healthcare intelligence platform providing "
        "FHIR proxy, HL7v2 parsing/transformation, AI-driven clinical insights, "
        "and automated care-gap detection."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS (dev mode: allow all) ────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(fhir.router, prefix="/api/fhir", tags=["FHIR"])
app.include_router(hl7.router, prefix="/api/hl7", tags=["HL7"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(care_gaps.router, prefix="/api/care-gaps", tags=["Care Gaps"])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def health_check() -> dict:
    return {"status": "ok", "service": "CareSync API"}


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "service": "CareSync API", "version": "1.0.0"}
