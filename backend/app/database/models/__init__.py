"""SQLAlchemy models. Import each model module here so Alembic sees its metadata."""

from app.database.base import Base

__all__ = ["Base"]
