import ast
import os
import subprocess
import sys
from pathlib import Path

from app.config import Settings

STUDENT_FACING_ROOTS = (
    "app/api",
    "app/auth",
    "app/classroom",
    "app/assistant",
    "app/retrieval",
    "app/validation",
)

FORBIDDEN_MARKERS = (
    "SUPABASE_SERVICE_ROLE_KEY",
    "supabase_service_role_key",
    "AdminSettings",
    "get_admin_settings",
    "app.database.admin",
    "create_client(",
)

# Modules the API process must never load: the admin client and the ingestion tools.
FORBIDDEN_MODULE_PREFIXES = ("app.database.admin", "ingest", "supabase")


def test_student_facing_modules_do_not_touch_service_role() -> None:
    checked = 0
    for root in STUDENT_FACING_ROOTS:
        for path in Path(root).rglob("*.py"):
            checked += 1
            source = path.read_text(encoding="utf-8")
            for marker in FORBIDDEN_MARKERS:
                assert marker not in source, f"{path} references {marker}"

    assert checked > 0, "expected student-facing modules to exist"


def test_api_settings_have_no_service_role_field() -> None:
    assert "supabase_service_role_key" not in Settings.model_fields


def test_main_does_not_import_admin_or_ingest_modules() -> None:
    """Walk the real import graph of `app.main` in a clean interpreter."""
    script = "import sys, app.main\nprint('\\n'.join(sorted(sys.modules)))\n"
    env = {k: v for k, v in os.environ.items() if k != "SUPABASE_SERVICE_ROLE_KEY"}
    result = subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True,
        text=True,
        env=env,
        check=True,
    )
    loaded = result.stdout.split()
    leaked = [
        name
        for name in loaded
        if any(name == p or name.startswith(p + ".") for p in FORBIDDEN_MODULE_PREFIXES)
    ]
    assert not leaked, f"app.main loaded privileged modules: {leaked}"


def test_admin_settings_are_only_built_outside_the_request_path() -> None:
    for path in Path("app").rglob("*.py"):
        if path.as_posix() == "app/config.py":
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and node.id in {"AdminSettings", "get_admin_settings"}:
                raise AssertionError(f"{path} uses {node.id}; only ingest/ and CLI may")
