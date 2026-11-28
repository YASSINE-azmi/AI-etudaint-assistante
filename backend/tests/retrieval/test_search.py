from typing import Any, cast

from sqlalchemy.ext.asyncio import AsyncSession

from app.retrieval import search
from app.retrieval.scope import Scope

SCOPE = Scope("tcs_ch01", frozenset({"tcs_ch01_o02", "tcs_ch01_o01"}))


class FakeSession:
    """Returns canned ids per SQL statement and records every call."""

    def __init__(self, rows: dict[object, list[str]]) -> None:
        self.rows = rows
        self.calls: list[tuple[object, dict[str, Any]]] = []

    async def execute(self, sql: object, params: dict[str, Any]) -> list[tuple[str]]:
        self.calls.append((sql, params))
        return [(i,) for i in self.rows.get(sql, [])]


def _session(fake: FakeSession) -> AsyncSession:
    return cast(AsyncSession, fake)


async def test_both_channels_are_scoped_and_fused_by_rrf() -> None:
    fake = FakeSession({search.SEMANTIC_SQL: ["a", "b"], search.LEXICAL_SQL: ["b", "c"]})
    fused = await search.hybrid_search(_session(fake), SCOPE, "les diviseurs de 12", [0.5, 1])
    assert [chunk_id for chunk_id, _ in fused] == ["b", "a", "c"]
    for _, params in fake.calls:
        assert params["chapter_id"] == "tcs_ch01"
        assert params["objective_ids"] == ["tcs_ch01_o01", "tcs_ch01_o02"]
        assert params["limit"] == search.PER_CHANNEL
    semantic, lexical = (params for _, params in fake.calls)
    assert semantic["query_embedding"] == "[0.5,1.0]"
    assert lexical["q"] == "les diviseurs de 12"


async def test_the_query_is_normalised_like_the_chunks() -> None:
    fake = FakeSession({search.LEXICAL_SQL: ["a"]})
    await search.lexical_ids(_session(fake), SCOPE, "x au carré ≤ $\\sqrt{2}$")
    assert fake.calls[0][1]["q"] == "x carre inferieur egal racine 2"


async def test_lexical_falls_back_to_or_when_the_and_query_finds_nothing() -> None:
    fake = FakeSession({search.LEXICAL_OR_SQL: ["z"]})
    ids = await search.lexical_ids(_session(fake), SCOPE, "c'est quoi les diviseurs premiers ?")
    assert ids == ["z"]
    assert [sql for sql, _ in fake.calls] == [search.LEXICAL_SQL, search.LEXICAL_OR_SQL]
    assert fake.calls[1][1]["q"] == "diviseur | premier"


async def test_no_fallback_when_the_query_has_no_terms() -> None:
    fake = FakeSession({})
    assert await search.lexical_ids(_session(fake), SCOPE, "c'est quoi ?") == []
    assert len(fake.calls) == 1


async def test_a_scope_without_objectives_never_queries() -> None:
    fake = FakeSession({search.SEMANTIC_SQL: ["a"]})
    empty = Scope("tcs_ch01", frozenset())
    assert await search.hybrid_search(_session(fake), empty, "diviseurs", [1.0]) == []
    assert fake.calls == []


def test_both_channels_carry_the_three_scope_filters() -> None:
    for sql in (search.SEMANTIC_SQL, search.LEXICAL_SQL, search.LEXICAL_OR_SQL):
        for clause in (
            "c.chapter_id = :chapter_id",
            "c.status = 'published'",
            "o.objective_id = any(:objective_ids)",
        ):
            assert clause in sql.text
