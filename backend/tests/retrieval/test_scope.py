import json
from pathlib import Path

import pytest

from app.retrieval.scope import Scope, chapter_scope, in_scope

ROOT = Path(__file__).resolve().parents[3]
MATRIX = json.loads((ROOT / "docs" / "curriculum" / "coverage-matrix.json").read_text("utf-8"))
SCOPE = Scope("tcs_ch01", frozenset({"tcs_ch01_o01", "tcs_ch01_o02"}))


def test_each_approved_chapter_scopes_to_its_own_objectives() -> None:
    for chapter in MATRIX["chapters"]:
        scope = chapter_scope(MATRIX, chapter["id"])
        assert scope is not None
        assert scope.objective_ids == {o["id"] for o in chapter["objectives"]}
        assert all(o.startswith(chapter["id"] + "_") for o in scope.objective_ids)


@pytest.mark.parametrize("chapter_id", ["tcs_ch04", "1bac_ch01", ""])
def test_a_chapter_outside_the_approved_matrix_has_no_scope(chapter_id: str) -> None:
    assert chapter_scope(MATRIX, chapter_id) is None


def test_a_published_chunk_of_the_chapter_mapped_to_an_objective_is_in_scope() -> None:
    assert in_scope(SCOPE, "tcs_ch01", "published", ["tcs_ch01_o02", "tcs_ch02_o01"])


@pytest.mark.parametrize(
    ("chapter_id", "status", "objectives", "why"),
    [
        ("tcs_ch02", "published", ["tcs_ch01_o01"], "other chapter"),
        ("tcs_ch01", "draft", ["tcs_ch01_o01"], "not published"),
        ("tcs_ch01", "withdrawn", ["tcs_ch01_o01"], "withdrawn"),
        ("tcs_ch01", "published", [], "mapped to no objective"),
        ("tcs_ch01", "published", ["tcs_ch01_o08"], "objective not in scope"),
    ],
)
def test_chunks_failing_any_filter_are_out_of_scope(
    chapter_id: str, status: str, objectives: list[str], why: str
) -> None:
    assert not in_scope(SCOPE, chapter_id, status, objectives), why


def test_the_schema_sql_applies_the_same_three_filters() -> None:
    spec = (ROOT / "docs" / "contracts" / "retrieval-schema.md").read_text("utf-8")
    sql = spec.split("## 6.")[1].split("```sql")[1].split("```")[0]
    for clause in (
        "c.chapter_id = :chapter_id",
        "c.status = 'published'",
        "o.objective_id = any(:objective_ids)",
    ):
        assert clause in sql
