import secrets

from fastapi import Header, HTTPException, status

from app.config import get_settings


settings = get_settings()


def verify_ml_secret_value(provided: str | None) -> None:
    expected = settings.ml_secret_token.strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML service authentication is not configured.",
        )
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ML service credentials.",
        )


def require_ml_secret(x_ml_secret: str | None = Header(default=None)) -> None:
    verify_ml_secret_value(x_ml_secret)
