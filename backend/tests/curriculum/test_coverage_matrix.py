import itertools
import json
import re
from pathlib import Path

MATRIX = Path(__file__).resolve().parents[3] / "docs" / "curriculum" / "coverage-matrix.json"
TAG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def _objectives() -> dict[str, dict]:
    chapters = json.loads(MATRIX.read_text(encoding="utf-8"))["chapters"]
    return {
        o["id"]: {**o, "chapter": c["chapter_number"]} for c in chapters for o in c["objectives"]
    }


def test_three_chapters_with_unique_ids_and_valid_tags() -> None:
    chapters = json.loads(MATRIX.read_text(encoding="utf-8"))["chapters"]
    assert [c["id"] for c in chapters] == ["tcs_ch01", "tcs_ch02", "tcs_ch03"]
    ids = [o["id"] for c in chapters for o in c["objectives"]]
    assert len(ids) == len(set(ids))
    for c in chapters:
        for o in c["objectives"]:
            assert o["id"].startswith(c["id"] + "_o")
            assert o["concept_tags"] and all(TAG.match(t) for t in o["concept_tags"])


def test_prerequisites_exist_and_never_point_to_a_later_chapter() -> None:
    objectives = _objectives()
    for o in objectives.values():
        for p in o["prerequisites"]:
            assert p in objectives, f"{o['id']} -> unknown {p}"
            assert objectives[p]["chapter"] <= o["chapter"], f"{o['id']} -> later {p}"


def test_prerequisite_graph_has_no_cycle() -> None:
    objectives = _objectives()
    state: dict[str, str] = {}

    def visit(oid: str) -> None:
        assert state.get(oid) != "open", f"cycle through {oid}"
        if state.get(oid) == "done":
            return
        state[oid] = "open"
        for p in objectives[oid]["prerequisites"]:
            visit(p)
        state[oid] = "done"

    for oid in objectives:
        visit(oid)


def test_page_ranges_are_contiguous_inside_and_across_chapters() -> None:
    chapters = json.loads(MATRIX.read_text(encoding="utf-8"))["chapters"]
    for previous, chapter in itertools.pairwise(chapters):
        assert chapter["page_start"] == previous["page_end"] + 1
    for chapter in chapters:
        parts = chapter["parts"]
        assert parts[0]["page_start"] == chapter["page_start"]
        assert parts[-1]["page_end"] == chapter["page_end"]
        for before, after in itertools.pairwise(parts):
            assert before["page_start"] <= before["page_end"] == after["page_start"] - 1
