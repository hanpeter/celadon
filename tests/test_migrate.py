import pytest
from click.testing import CliRunner
from unittest.mock import MagicMock, patch

from celadon.migrate import main


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def mig_dir(tmp_path):
    d = tmp_path / "migrations"
    d.mkdir()
    return d


@pytest.fixture
def mock_yoyo():
    """Patches get_backend and read_migrations. Yields (backend, migrations)."""
    migs = [MagicMock(id="0001.initial-schema"), MagicMock(id="0002.add-index")]
    backend = MagicMock()
    with patch("celadon.migrate.get_backend", return_value=backend), \
         patch("celadon.migrate.read_migrations", return_value=migs):
        yield backend, migs


def _invoke(runner, mig_dir, db_url, *args):
    return runner.invoke(main, [
        "--database-url", db_url,
        "--migrations-dir", str(mig_dir),
        *args,
    ])


def test_missing_database_url(runner, mig_dir):
    result = runner.invoke(main, ["--migrations-dir", str(mig_dir), "apply"])
    assert result.exit_code != 0


def test_missing_migrations_dir(runner):
    result = runner.invoke(main, [
        "--database-url", "postgres://u:p@h/db",
        "--migrations-dir", "/nonexistent/does-not-exist",
        "apply",
    ])
    assert result.exit_code != 0


def test_invalid_scheme(runner, mig_dir):
    result = _invoke(runner, mig_dir, "mysql://u:p@h/db", "apply")
    assert result.exit_code != 0
    assert "Unsupported DATABASE_URL scheme" in result.output


def test_postgres_scheme_normalized(runner, mig_dir):
    result = _invoke(runner, mig_dir, "postgres://u:p@h/db", "apply")
    assert not isinstance(result.exception, ValueError), "postgres:// should normalize without scheme error"


def test_postgresql_scheme_normalized(runner, mig_dir):
    result = _invoke(runner, mig_dir, "postgresql://u:p@h/db", "apply")
    assert not isinstance(result.exception, ValueError), "postgresql:// should normalize without scheme error"


def test_already_normalized_scheme(runner, mig_dir):
    result = _invoke(runner, mig_dir, "postgresql+psycopg://u:p@h/db", "apply")
    assert not isinstance(result.exception, ValueError)


def test_options_query_string_preserved(runner, mig_dir):
    result = _invoke(runner, mig_dir, "postgres://u:p@h/db?options=-csearch_path%3Dceladon_schema", "apply")
    assert not isinstance(result.exception, ValueError)


def test_url_encoded_password(runner, mig_dir):
    result = _invoke(runner, mig_dir, "postgres://u:%40pw@h/db", "apply")
    assert not isinstance(result.exception, ValueError)


# --- yoyo API contract tests ---


def test_apply_calls_apply_migrations(runner, mig_dir, mock_yoyo):
    backend, migs = mock_yoyo
    backend.to_apply.return_value = migs
    result = _invoke(runner, mig_dir, "postgres://u:p@h/db", "apply")
    assert result.exit_code == 0
    backend.apply_migrations.assert_called_once_with(migs)


def test_apply_noop_when_no_pending(runner, mig_dir, mock_yoyo):
    backend, _ = mock_yoyo
    backend.to_apply.return_value = []
    result = _invoke(runner, mig_dir, "postgres://u:p@h/db", "apply")
    assert result.exit_code == 0
    backend.apply_migrations.assert_not_called()


def test_list_outputs_applied_and_unapplied(runner, mig_dir, mock_yoyo):
    backend, migs = mock_yoyo
    backend.to_rollback.return_value = [migs[0]]
    result = _invoke(runner, mig_dir, "postgres://u:p@h/db", "list")
    assert result.exit_code == 0
    assert "A 0001.initial-schema" in result.output
    assert "U 0002.add-index" in result.output


def test_rollback_default_count(runner, mig_dir, mock_yoyo):
    backend, migs = mock_yoyo
    backend.to_rollback.return_value = migs
    result = _invoke(runner, mig_dir, "postgres://u:p@h/db", "rollback")
    assert result.exit_code == 0
    backend.rollback_migrations.assert_called_once_with([migs[0]])


def test_rollback_explicit_count(runner, mig_dir, mock_yoyo):
    backend, migs = mock_yoyo
    backend.to_rollback.return_value = migs
    result = _invoke(runner, mig_dir, "postgres://u:p@h/db", "rollback", "--count", "2")
    assert result.exit_code == 0
    backend.rollback_migrations.assert_called_once_with(migs)


def test_rollback_noop_when_nothing(runner, mig_dir, mock_yoyo):
    backend, _ = mock_yoyo
    backend.to_rollback.return_value = []
    result = _invoke(runner, mig_dir, "postgres://u:p@h/db", "rollback")
    assert result.exit_code == 0
    backend.rollback_migrations.assert_not_called()


def test_mark_calls_mark_migrations(runner, mig_dir, mock_yoyo):
    backend, migs = mock_yoyo
    result = _invoke(runner, mig_dir, "postgres://u:p@h/db", "mark", "0001.initial-schema")
    assert result.exit_code == 0
    backend.mark_migrations.assert_called_once_with([migs[0]])


def test_mark_unknown_migration(runner, mig_dir, mock_yoyo):
    result = _invoke(runner, mig_dir, "postgres://u:p@h/db", "mark", "9999.nonexistent")
    assert result.exit_code != 0
