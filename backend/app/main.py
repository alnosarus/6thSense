from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import health, leads
from app.core.config import get_settings
from app.core.middleware import MaxBodySizeMiddleware


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="6thSense API",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(MaxBodySizeMiddleware)

    @application.exception_handler(RequestValidationError)
    async def _validation_handler(_req: Request, exc: RequestValidationError):
        # PII-safe: drop any `input` field; keep only field path + message.
        errors: dict[str, str] = {}
        for err in exc.errors():
            loc = err.get("loc") or ()
            field = loc[-1] if loc else "body"
            errors[str(field)] = err.get("msg", "Invalid value.")
        return JSONResponse(
            status_code=400,
            content={"ok": False, "errors": errors},
        )

    application.include_router(health.router)
    application.include_router(leads.router)
    return application


app = create_app()
