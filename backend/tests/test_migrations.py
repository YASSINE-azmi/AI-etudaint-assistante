import subprocess
import sys

import pytest

pytestmark = pytest.mark.integration


def _alembic(*args: str) -> None:
    subprocess.run([sys.executable, "-m", "alembic", *args], check=True)


def test_migrations_upgrade_and_downgrade_round_trip() -> None:
    _alembic("upgrade", "head")
    _alembic("downgrade", "base")
    _alembic("upgrade", "head")
