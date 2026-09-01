from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .errors import AuthorizationError
from .modules.ai_receptionist.routes import router as ai_receptionist_router

app = FastAPI(
    title="NexCore Backend",
    version="0.1.0",
    description=(
        "Server-to-server authority for AI Receptionist session authorization "
        "and quota enforcement. Not exposed to browsers."
    ),
)


@app.exception_handler(AuthorizationError)
async def _authorization_error_handler(
    _request: Request, exc: AuthorizationError
) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_payload())


@app.get("/healthz", tags=["meta"])
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(
    ai_receptionist_router,
    prefix="/v1/ai-receptionist",
    tags=["ai-receptionist"],
)
