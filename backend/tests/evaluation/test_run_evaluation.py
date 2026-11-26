import json
from collections import Counter

from scripts.run_evaluation import CASES, SCORE_COLUMNS, TurnResult, parse_stream, sheet_row


def _data(part: dict) -> str:
    return "data: " + json.dumps(part)


def test_parses_an_accepted_turn() -> None:
    lines = [
        _data({"type": "start", "messageId": "t"}),
        _data({"type": "data-validation-completed", "data": {"educationalStatus": "accepted"}}),
        _data({"type": "text-start", "id": "t1"}),
        _data({"type": "text-delta", "id": "t1", "delta": "PGCD(12 ; 15) = 3"}),
        _data({"type": "text-end", "id": "t1"}),
        _data({"type": "data-message-final", "data": {"citations": [{"page": 12}]}}),
        "",
        "data: [DONE]",
    ]
    result = parse_stream(lines)
    assert result.released and result.text == "PGCD(12 ; 15) = 3"
    assert result.citations == [{"page": 12}] and result.refusal_code == ""


def test_parses_a_refusal_as_not_released() -> None:
    lines = [
        _data({"type": "text-delta", "id": "t1", "delta": "Cette question dépasse..."}),
        _data(
            {
                "type": "data-message-final",
                "data": {"citations": [], "refusalCode": "OUT_OF_SCOPE_LEVEL"},
            }
        ),
    ]
    result = parse_stream(lines)
    assert not result.released and result.refusal_code == "OUT_OF_SCOPE_LEVEL"


def test_parses_a_failed_turn() -> None:
    failed = {
        "type": "data-turn-failed",
        "data": {"code": "PROVIDER_UNAVAILABLE", "messageFr": "x"},
    }
    result = parse_stream([_data(failed)])
    assert not result.released and result.refusal_code == "PROVIDER_UNAVAILABLE"


def test_sheet_row_leaves_scores_blank_for_the_reviewer() -> None:
    case = json.loads(CASES.read_text(encoding="utf-8"))["cases"][0]
    row = sheet_row(case, TurnResult(released=True, text="..."))
    assert all(row[c] == "" for c in SCORE_COLUMNS)
    assert row["question"] == case["question"] and row["released"] == "yes"


def test_cases_match_the_plan_quotas_and_go_from_vague_to_detailed() -> None:
    cases = json.loads(CASES.read_text(encoding="utf-8"))["cases"]
    assert Counter(c["set"] for c in cases) == {
        "in_scope": 20,
        "out_of_scope": 8,
        "missing_evidence": 6,
        "prompt_injection": 6,
    }
    assert len({c["id"] for c in cases}) == 40
    for name in ("in_scope", "out_of_scope", "missing_evidence", "prompt_injection"):
        levels = [c["detail_level"] for c in cases if c["set"] == name]
        assert levels == sorted(levels) and set(levels) == {1, 2, 3}


def test_in_scope_cases_cover_the_three_chapters_of_the_coverage_matrix() -> None:
    cases = json.loads(CASES.read_text(encoding="utf-8"))["cases"]
    matrix = json.loads(
        (CASES.parents[1] / "curriculum" / "coverage-matrix.json").read_text("utf-8")
    )
    chapters = {c["id"] for c in matrix["chapters"]}
    assert {c["chapter_id"] for c in cases} == chapters
    in_scope = Counter(c["chapter_id"] for c in cases if c["set"] == "in_scope")
    assert in_scope == {"tcs_ch01": 7, "tcs_ch02": 7, "tcs_ch03": 6}
