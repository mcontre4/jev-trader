"""Regression checks: immutable time values and injected clocks are not wall-clock access."""

import importlib.util
from pathlib import Path

import pytest


@pytest.fixture
def checker():
    path = Path(__file__).resolve().parents[3] / "scripts" / "check_hexagonal_boundaries.py"
    spec = importlib.util.spec_from_file_location("boundary_checker", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize("statement", ["datetime.now()", "datetime.utcnow()", "datetime.today()"])
def test_boundary_checker_still_rejects_wall_clock(checker, tmp_path, statement):
    file = tmp_path / "app" / "trading" / "domain" / "model.py"
    file.parent.mkdir(parents=True)
    file.write_text(f"from datetime import datetime\nvalue = {statement}\n")
    assert any("must not call" in v[2] for v in checker.check_file(tmp_path, file))


def test_boundary_checker_accepts_injected_clock_and_immutable_values(checker, tmp_path):
    file = tmp_path / "app" / "trading" / "application" / "run.py"
    file.parent.mkdir(parents=True)
    file.write_text("""from datetime import datetime, timedelta
from app.shared.domain.clock import Clock
class Run:
    def __init__(self, clock: Clock):
        self._clock = clock
    def execute(self, request: RunRequest):
        return self._clock.now() + timedelta(seconds=30)
""")
    assert checker.check_file(tmp_path, file) == []
