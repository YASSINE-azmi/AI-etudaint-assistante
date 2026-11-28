"""Hybrid search against real Postgres + pgvector.

The tables are temporary copies of docs/contracts/retrieval-schema.md §1 (only the columns
the search reads), because the real migration lands in Week 5. Replace them with the
migrated tables then.
"""

import os
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.retrieval.normalize import search_text
from app.retrieval.scope import Scope
from app.retrieval.search import hybrid_search

pytestmark = pytest.mark.integration

DIM = 1024
SCOPE = Scope("tcs_ch01", frozenset({"tcs_ch01_o03"}))

# (chapter, status, objective, text, embedding axis). Synthetic text, not textbook content.
ROWS = [
    ("tcs_ch01", "published", "tcs_ch01_o03", "Un nombre premier a exactement deux diviseurs.", 0),
    ("tcs_ch01", "published", "tcs_ch01_o03", "Le crible permet de trouver les premiers.", 1),
    ("tcs_ch01", "draft", "tcs_ch01_o03", "Brouillon sur les nombres premiers diviseurs.", 0),
    ("tcs_ch02", "published", "tcs_ch01_o03", "Autre chapitre : nombres premiers diviseurs.", 0),
    ("tcs_ch01", "published", "tcs_ch01_o01", "Hors objectif : nombres premiers diviseurs.", 0),
]


def _vector(axis: int) -> str:
    return "[" + ",".join("1" if i == axis else "0" for i in range(DIM)) + "]"


async def test_hybrid_search_returns_only_scoped_published_chunks() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    ids = [str(uuid.uuid4()) for _ in ROWS]
    async with engine.connect() as conn:
        await conn.execute(text("create extension if not exists vector"))
        await conn.execute(
            text(f"""
            create temporary table document_chunks (
                id uuid primary key, chapter_id text not null, status text not null,
                search_text text not null,
                search_vector tsvector generated always as
                    (to_tsvector('french', search_text)) stored,
                embedding vector({DIM})
            )""")
        )
        await conn.execute(
            text("create temporary table chunk_objectives (chunk_id uuid, objective_id text)")
        )
        for chunk_id, (chapter, status, objective, body, axis) in zip(ids, ROWS, strict=True):
            await conn.execute(
                text(
                    "insert into document_chunks (id, chapter_id, status, search_text, embedding)"
                    " values"
                    " (:id, :chapter, :status, :search_text, cast(:embedding as vector))"
                ),
                {
                    "id": chunk_id,
                    "chapter": chapter,
                    "status": status,
                    "search_text": search_text(body),
                    "embedding": _vector(axis),
                },
            )
            await conn.execute(
                text("insert into chunk_objectives values (:id, :objective)"),
                {"id": chunk_id, "objective": objective},
            )

        session = AsyncSession(bind=conn)
        query_vector = [1.0 if i == 0 else 0.0 for i in range(DIM)]
        fused = await hybrid_search(session, SCOPE, "les nombres premiers", query_vector)
        await session.close()
    await engine.dispose()

    assert [chunk_id for chunk_id, _ in fused] == [ids[0], ids[1]]
