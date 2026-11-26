from pathlib import Path

from app.validation.refusal import REFUSALS, EducationalStatus, RefusalCode

# Plan §7.4: refusals are completed turns, failures are failed turns, and the two
# pre-stream limits carry no educational status.
_EXPECTED = {
    RefusalCode.OUT_OF_SCOPE_LEVEL: ("refusal", EducationalStatus.OUTSIDE_SCOPE, False),
    RefusalCode.OUT_OF_SCOPE_CHAPTER: ("refusal", EducationalStatus.OUTSIDE_SCOPE, False),
    RefusalCode.INSUFFICIENT_EVIDENCE: (
        "refusal",
        EducationalStatus.INSUFFICIENT_EVIDENCE,
        False,
    ),
    RefusalCode.AMBIGUOUS_QUESTION: ("refusal", EducationalStatus.CLARIFICATION_REQUIRED, False),
    RefusalCode.MATH_UNVERIFIABLE: ("refusal", EducationalStatus.VALIDATION_FAILED, False),
    RefusalCode.MATH_INCORRECT: ("refusal", EducationalStatus.VALIDATION_FAILED, False),
    RefusalCode.RENDERING_UNSAFE: ("refusal", EducationalStatus.VALIDATION_FAILED, False),
    RefusalCode.SOURCE_WITHDRAWN: ("refusal", EducationalStatus.SOURCE_WITHDRAWN, False),
    RefusalCode.PROVIDER_UNAVAILABLE: ("failure", EducationalStatus.PROVIDER_UNAVAILABLE, True),
    RefusalCode.CREDIT_EXHAUSTED: ("failure", EducationalStatus.CREDIT_EXHAUSTED, False),
    RefusalCode.RATE_LIMITED: ("http", None, True),
    RefusalCode.TURN_LIMIT_REACHED: ("http", None, False),
}


def test_every_code_has_exactly_one_template() -> None:
    assert set(REFUSALS) == set(RefusalCode)


def test_delivery_status_and_retry_match_the_plan() -> None:
    actual = {code: (t.delivery, t.educational_status, t.retryable) for code, t in REFUSALS.items()}
    assert actual == _EXPECTED


def test_templates_are_non_empty_french_sentences() -> None:
    for template in REFUSALS.values():
        assert template.message_fr.strip().endswith((".", "?"))


def test_the_contracts_doc_table_matches_the_templates() -> None:
    doc = Path(__file__).resolve().parents[3] / "docs" / "contracts" / "teaching-contracts.md"
    rows = {}
    for line in doc.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) == 5 and cells[0].startswith("`") and cells[0].strip("`") in REFUSALS:
            rows[cells[0].strip("`")] = cells[1:]
    assert rows.keys() == {c.value for c in REFUSALS}
    for code, (status, delivery, retry, message) in rows.items():
        t = REFUSALS[RefusalCode(code)]
        assert status == (t.educational_status or "—")
        assert (delivery, retry) == (t.delivery, "yes" if t.retryable else "no")
        assert message == t.message_fr
