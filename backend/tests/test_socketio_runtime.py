from pathlib import Path


def test_gunicorn_runtime_branch_does_not_force_threading():
    app_source = Path(__file__).resolve().parents[1] / "app.py"
    content = app_source.read_text(encoding="utf-8")

    assert 'async_mode=\'threading\'' not in content
    assert 'async_mode="threading"' not in content


def test_socketio_supports_debug_logging_flags():
    app_source = Path(__file__).resolve().parents[1] / "app.py"
    content = app_source.read_text(encoding="utf-8")

    assert "SOCKETIO_DEBUG" in content
    assert "engineio_logger" in content
    assert "logger=socketio_debug" in content


def test_app_module_creates_global_app_only_once():
    app_source = Path(__file__).resolve().parents[1] / "app.py"
    content = app_source.read_text(encoding="utf-8")

    assert content.count("app = create_app()") == 1
