"""Send the 20+20 evaluation cases through the real tutor and build the grading sheet.

Each case gets a fresh session and goes through the same API a student uses
(retrieval, draft, four gates), never straight to the model. The reviewer then only
fills in the score columns of the sheet (docs/evaluation/rubric.md).

    uv run python -m scripts.run_evaluation --api http://localhost:8000 \\
        --token-file <file with a synthetic evaluator's Supabase access token> \\
        --prompt-version teach-v0.1 --corpus-revision <curriculum_revision_id>

Output goes to data/extracted/evaluation/<timestamp>/ (gitignored: answers quote the
textbook): run.json with the versions, and grading.csv for the reviewer.

The session and turn request bodies follow plan §7.1 and docs/contracts/sse-turn-contract.md;
check them against the implemented endpoints before the first run.
"""

import argparse
import csv
import json
import subprocess
import uuid
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
CASES = ROOT / "docs" / "evaluation" / "cases.json"
OUT_DIR = ROOT / "data" / "extracted" / "evaluation"
SCORE_COLUMNS = ["correctness", "scope", "notation", "age", "citation_ok", "pass", "grader_note"]


@dataclass
class TurnResult:
    released: bool = False
    text: str = ""
    refusal_code: str = ""
    citations: list[dict[str, object]] = field(default_factory=list)
    error: str = ""


def parse_stream(lines: Iterable[str]) -> TurnResult:
    """Read an AI SDK UI message stream (contract §Mohamed's part, plan Appendix D)."""
    result = TurnResult()
    for line in lines:
        if not line.startswith("data:"):
            continue
        payload = line[5:].strip()
        if payload == "[DONE]":
            break
        part = json.loads(payload)
        kind, data = part.get("type"), part.get("data") or {}
        if kind == "text-delta":
            result.text += part.get("delta", "")
        elif kind == "data-message-final":
            result.citations = data.get("citations", [])
            result.refusal_code = data.get("refusalCode") or ""
            result.released = not result.refusal_code
        elif kind == "data-turn-failed":
            result.refusal_code = data.get("code", "")
            result.text = data.get("messageFr", "")
            result.released = False
    return result


def run_case(client: httpx.Client, case: dict[str, object]) -> TurnResult:
    try:
        session = client.post("/api/v1/sessions", json={"chapterId": case["chapter_id"]})
        session.raise_for_status()
        session_id = session.json()["id"]
        with client.stream(
            "POST",
            f"/api/v1/sessions/{session_id}/turns",
            headers={"Idempotency-Key": str(uuid.uuid4())},
            json={"prompt": case["question"], "chapterId": case["chapter_id"]},
        ) as response:
            if response.status_code in (409, 429):
                return TurnResult(refusal_code=response.json().get("code", ""))
            response.raise_for_status()
            return parse_stream(response.iter_lines())
    except httpx.HTTPError as exc:
        return TurnResult(error=f"{type(exc).__name__}: {exc}")


def sheet_row(case: dict[str, object], result: TurnResult) -> dict[str, object]:
    expected = case["expected"]
    assert isinstance(expected, dict)
    row: dict[str, object] = {
        "id": case["id"],
        "set": case["set"],
        "detail_level": case["detail_level"],
        "question": case["question"],
        "expected_outcome": expected["outcome"],
        "expected_codes": " | ".join(expected.get("refusal_codes", [])),
        "correct_result": expected.get("correct_result", ""),
        "key_points": expected.get("key_points", ""),
        "reviewer_note": case.get("reviewer_note", ""),
        "released": "yes" if result.released else "no",
        "refusal_code": result.refusal_code,
        "answer": result.text,
        "citations": "; ".join(
            f"p.{c.get('page')} {c.get('section')}: {c.get('quote')}" for c in result.citations
        ),
        "run_error": result.error,
    }
    row.update(dict.fromkeys(SCORE_COLUMNS, ""))
    return row


def git_commit() -> str:
    out = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True
    )
    return out.stdout.strip() or "unknown"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--api", required=True)
    parser.add_argument("--token-file", required=True, type=Path)
    parser.add_argument("--prompt-version", required=True)
    parser.add_argument("--corpus-revision", required=True)
    parser.add_argument("--llm-model", default="deepseek-flash")
    parser.add_argument("--embedding-model", default="intfloat/multilingual-e5-large")
    parser.add_argument("--grader", default="")
    args = parser.parse_args()

    spec = json.loads(CASES.read_text(encoding="utf-8"))
    token = args.token_file.read_text(encoding="utf-8").strip()
    started = datetime.now(UTC)
    out = OUT_DIR / started.strftime("%Y%m%dT%H%M%SZ")
    out.mkdir(parents=True)

    headers = {"Authorization": f"Bearer {token}"}
    with httpx.Client(base_url=args.api, headers=headers, timeout=60) as client:
        rows = []
        for case in spec["cases"]:
            result = run_case(client, case)
            rows.append(sheet_row(case, result))
            status = result.error or result.refusal_code or "released"
            print(f"{case['id']:7} {status}")

    run = {
        "run_date": started.isoformat(),
        "rubric_version": "see docs/evaluation/rubric.md",
        "cases_version": spec["version"],
        "llm_model": args.llm_model,
        "prompt_version": args.prompt_version,
        "embedding_model": args.embedding_model,
        "corpus_revision": args.corpus_revision,
        "gate_version": git_commit(),
        "refusal_templates": "refusal-fr-v0.1",
        "grader": args.grader,
        "api": args.api,
    }
    (out / "run.json").write_text(json.dumps(run, indent=2), encoding="utf-8")
    # utf-8-sig so Excel opens the French text correctly.
    with (out / "grading.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f"\ngrading sheet: {out / 'grading.csv'}")


if __name__ == "__main__":
    main()
