import os
import threading
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.database.connection import init_db, AsyncSessionLocal
from backend.database.repository import Repository
from backend.rag.vectorstore import auto_seed_kb
from backend.api import auth, session, chat, rag, report, analytics, settings as settings_api

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup DB init & seed data creation
    await init_db()
    async with AsyncSessionLocal() as db:
        repo = Repository(db)
        # Create default Admin, Trainer, and Support Agent if not exists
        admin = await repo.get_user_by_email("admin@coach.ai")
        if not admin:
            await repo.create_user("admin@coach.ai", "Admin@123456", "System Administrator", "admin")
        trainer = await repo.get_user_by_email("trainer@coach.ai")
        if not trainer:
            await repo.create_user("trainer@coach.ai", "Trainer@123456", "Senior Support Trainer", "trainer")
        agent = await repo.get_user_by_email("agent@coach.ai")
        if not agent:
            await repo.create_user("agent@coach.ai", "Agent@123456", "Support Agent Demo", "agent")

    # Auto-seed Knowledge Base in ChromaDB if empty (non-blocking)
    threading.Thread(target=auto_seed_kb, daemon=True).start()

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(session.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(rag.router, prefix=settings.API_V1_STR)
app.include_router(report.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(settings_api.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "title": settings.PROJECT_NAME,
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
