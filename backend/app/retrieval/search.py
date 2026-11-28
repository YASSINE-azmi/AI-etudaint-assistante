"""Scoped hybrid retrieval (plan §10.2): pgvector cosine + French full-text, fused by RRF.

The SQL follows docs/contracts/retrieval-schema.md §6. Both channels apply the same scope
filter as `app.retrieval.scope.in_scope`: the session's chapter, published rows only, and
chunks mapped to one of the scope's objectives.
"""

from collections.abc import Sequence

from sqlalchemy import TextClause, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.retrieval.fusion import rrf
from app.retrieval.normalize import search_text, tokens
from app.retrieval.scope import Scope

PER_CHANNEL = 20

_SCOPE = """
    c.chapter_id = :chapter_id
    and c.status = 'published'
    and exists (select 1 from chunk_objectives o
                where o.chunk_id = c.id and o.objective_id = any(:objective_ids))
"""

SEMANTIC_SQL = text(f"""
select c.id::text from document_chunks c
where {_SCOPE}
order by c.embedding <=> cast(:query_embedding as vector), c.id
limit :limit
""")

_LEXICAL = """
select c.id::text from document_chunks c, {tsquery} query
where {scope} and c.search_vector @@ query
order by ts_rank_cd(c.search_vector, query) desc, c.id
limit :limit
"""
LEXICAL_SQL = text(_LEXICAL.format(tsquery="websearch_to_tsquery('french', :q)", scope=_SCOPE))
# OR fallback: any query term may match, when the AND of websearch finds nothing.
LEXICAL_OR_SQL = text(_LEXICAL.format(tsquery="to_tsquery('french', :q)", scope=_SCOPE))


async def _ids(session: AsyncSession, sql: TextClause, params: dict[str, object]) -> list[str]:
    result = await session.execute(sql, params)
    return [row[0] for row in result]


async def semantic_ids(
    session: AsyncSession, scope: Scope, query_embedding: Sequence[float]
) -> list[str]:
    vector = "[" + ",".join(str(float(x)) for x in query_embedding) + "]"
    return await _ids(session, SEMANTIC_SQL, _params(scope, query_embedding=vector))


async def lexical_ids(session: AsyncSession, scope: Scope, query: str) -> list[str]:
    ids = await _ids(session, LEXICAL_SQL, _params(scope, q=search_text(query)))
    terms = tokens(query)  # only [a-z0-9] words, so the tsquery string cannot be malformed
    if ids or not terms:
        return ids
    return await _ids(session, LEXICAL_OR_SQL, _params(scope, q=" | ".join(terms)))


async def hybrid_search(
    session: AsyncSession, scope: Scope, query: str, query_embedding: Sequence[float]
) -> list[tuple[str, float]]:
    """Fused (chunk_id, RRF score) for the scope; empty when the scope has no objectives."""
    if not scope.objective_ids:
        return []
    semantic = await semantic_ids(session, scope, query_embedding)
    lexical = await lexical_ids(session, scope, query)
    return rrf([semantic, lexical])


def _params(scope: Scope, **extra: object) -> dict[str, object]:
    return {
        "chapter_id": scope.chapter_id,
        "objective_ids": sorted(scope.objective_ids),
        "limit": PER_CHANNEL,
        **extra,
    }
