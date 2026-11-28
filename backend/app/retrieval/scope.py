"""Retrieval scope (plan §10.2): one approved chapter, published chunks, its objectives.

`in_scope` is the Python twin of the SQL filter in docs/contracts/retrieval-schema.md §6,
so the rule is unit-tested without a database and both stay in step.
"""

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Scope:
    chapter_id: str
    objective_ids: frozenset[str]


def chapter_scope(matrix: Mapping[str, Any], chapter_id: str) -> Scope | None:
    """Scope of an approved chapter, or None: the caller refuses with OUT_OF_SCOPE_CHAPTER."""
    for chapter in matrix["chapters"]:
        if chapter["id"] == chapter_id:
            return Scope(chapter_id, frozenset(o["id"] for o in chapter["objectives"]))
    return None


def in_scope(scope: Scope, chapter_id: str, status: str, objective_ids: Iterable[str]) -> bool:
    # A chunk mapped to no objective (e.g. a chapter intro) is never evidence.
    return (
        chapter_id == scope.chapter_id
        and status == "published"
        and not scope.objective_ids.isdisjoint(objective_ids)
    )
