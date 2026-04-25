from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.api_models import HealthResponse
from app.routers import circuits, components, export, projects, ws


def create_app() -> FastAPI:
    app = FastAPI(
        title="CircuitMind API",
        version="0.1.0",
        description="AI-powered electrical circuit design",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
    app.include_router(circuits.router, prefix="/api/v1/circuits", tags=["circuits"])
    app.include_router(components.router, prefix="/api/v1/components", tags=["components"])
    app.include_router(export.router, prefix="/api/v1/export", tags=["export"])
    app.include_router(ws.router)

    @app.get("/health", response_model=HealthResponse, tags=["health"])
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", version="0.1.0")

    return app


app = create_app()
