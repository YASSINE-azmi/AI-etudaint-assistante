import csv
import json
from pathlib import Path

import pytest

from scripts import retrieval_grading
from scripts.retrieval_spike import QUERIES_DIR

MATRIX = Path(__file__).resolve().parents[3] / "docs" / "curriculum" / "coverage-matrix.json"


def _queries() -> dict[str, list[dict]]:
    return {
        p.stem: json.loads(p.read_text(encoding="utf-8"))["queries"]
        for p in sorted(QUERIES_DIR.glob("*.json"))
    }


def test_the_set_meets_the_week_2_rules() -> None:
    sets = _queries()
    objectives = {
        o["id"]
        for c in json.loads(MATRIX.read_text(encoding="utf-8"))["chapters"]
        for o in c["objectives"]
    }
    every = [q for qs in sets.values() for q in qs]
    assert 40 <= len(every) <= 60
    assert all(len(qs) >= 10 for qs in sets.values()) and len(sets) == 3
    assert {q["objective_id"] for q in every} == objectives  # every objective represented
    holdout = sum(q["split"] == "holdout" for q in every) / len(every)
    assert 0.25 <= holdout <= 0.35
    for q in every:
        assert q["split"] in ("tune", "holdout")
        assert set(q["grades"].values()) <= {0, 1, 2} and 2 in q["grades"].values()


def _write_sheet(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=retrieval_grading.COLUMNS)
        writer.writeheader()
        writer.writerows({c: r.get(c, "") for c in retrieval_grading.COLUMNS} for r in rows)


def test_import_replaces_grades_from_the_sheet(tmp_path, monkeypatch) -> None:
    spec = {"queries": [{"q": "x", "split": "tune", "objective_id": "o", "grades": {"a": 2}}]}
    (tmp_path / "tcs_ch09.json").write_text(json.dumps(spec), encoding="utf-8")
    monkeypatch.setattr(retrieval_grading, "QUERIES_DIR", tmp_path)
    sheet = tmp_path / "sheet.csv"
    rows = [
        {"chapter_id": "tcs_ch09", "query_no": 0, "chunk_id": "a", "grade": "1"},
        {"chapter_id": "tcs_ch09", "query_no": 0, "chunk_id": "b", "grade": "2"},
    ]
    _write_sheet(sheet, rows)
    assert retrieval_grading.import_grades(sheet) == 2
    stored = json.loads((tmp_path / "tcs_ch09.json").read_text(encoding="utf-8"))
    assert stored["queries"][0]["grades"] == {"a": 1, "b": 2}


def test_import_refuses_a_sheet_with_blank_grades(tmp_path) -> None:
    sheet = tmp_path / "sheet.csv"
    _write_sheet(sheet, [{"chapter_id": "tcs_ch09", "query_no": 0, "chunk_id": "a"}])
    with pytest.raises(SystemExit):
        retrieval_grading.import_grades(sheet)
