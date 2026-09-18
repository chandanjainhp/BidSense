from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import logging

logger = logging.getLogger(__name__)


class BidSenseException(HTTPException):
    """Base exception for BidSense domain errors."""

    def __init__(
        self,
        detail: str,
        code: str = "UNKNOWN_ERROR",
        fields: dict | None = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code
        self.fields = fields or {}


class NotFoundError(BidSenseException):
    """Resource not found."""

    def __init__(self, detail: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(detail=detail, code=code, status_code=status.HTTP_404_NOT_FOUND)


class PermissionDeniedError(BidSenseException):
    """User doesn't have permission to perform action."""

    def __init__(self, detail: str = "Permission denied", code: str = "PERMISSION_DENIED"):
        super().__init__(detail=detail, code=code, status_code=status.HTTP_403_FORBIDDEN)


class ConflictError(BidSenseException):
    """Resource conflict (e.g., duplicate email)."""

    def __init__(
        self, detail: str = "Resource already exists", code: str = "CONFLICT", fields: dict | None = None
    ):
        super().__init__(detail=detail, code=code, fields=fields, status_code=status.HTTP_409_CONFLICT)


class UnprocessableError(BidSenseException):
    """Request cannot be processed (validation/business logic)."""

    def __init__(
        self, detail: str = "Unprocessable entity", code: str = "UNPROCESSABLE", fields: dict | None = None
    ):
        super().__init__(detail=detail, code=code, fields=fields, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


async def bidsense_exception_handler(request: Request, exc: BidSenseException) -> JSONResponse:
    """Handle BidSenseException with consistent error format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "code": exc.code,
            "fields": exc.fields,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic/FastAPI validation errors."""
    errors = {}
    for error in exc.errors():
        loc = error.get("loc", [])
        field_name = ".".join(str(l) for l in loc[1:]) if len(loc) > 1 else loc[0] if loc else "unknown"
        errors[field_name] = error.get("msg", "Invalid value")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "code": "VALIDATION_ERROR",
            "fields": errors,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.exception(f"Unexpected error on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred",
            "code": "INTERNAL_ERROR",
            "fields": {},
        },
    )
