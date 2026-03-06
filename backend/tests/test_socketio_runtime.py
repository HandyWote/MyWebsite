from pathlib import Path


def test_gunicorn_runtime_branch_does_not_force_threading():
    app_source = Path(__file__).resolve().parents[1] / "app.py"
    content = app_source.read_text(encoding="utf-8")

    assert 'async_mode=\'threading\'' not in content
    assert 'async_mode="threading"' not in content
