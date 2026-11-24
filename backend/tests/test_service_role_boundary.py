from pathlib import Path

STUDENT_FACING_ROOTS = (
    "app/api",
    "app/classroom",
    "app/assistant",
    "app/retrieval",
    "app/validation",
)

FORBIDDEN_MARKERS = (
    "SUPABASE_SERVICE_ROLE_KEY",
    "app.database.admin",
    "create_client(",
)


def test_student_facing_modules_do_not_touch_service_role() -> None:
    checked = 0
    for root in STUDENT_FACING_ROOTS:
        for path in Path(root).rglob("*.py"):
            checked += 1
            source = path.read_text(encoding="utf-8")
            for marker in FORBIDDEN_MARKERS:
                assert marker not in source, f"{path} references {marker}"

    assert checked > 0, "expected student-facing modules to exist"
