"""Celadon DB migration entrypoint. Thin wrapper around yoyo-migrations.

Accepts DATABASE_URL (--database-url / envvar DATABASE_URL),
CELADON_LOG_LEVEL (--log-level / envvar CELADON_LOG_LEVEL), and
CELADON_MIGRATIONS_DIR (--migrations-dir / envvar CELADON_MIGRATIONS_DIR)
as Click options on the main group. Normalizes the DATABASE_URL scheme to
'postgresql+psycopg://', preserves the query string (so
'?options=-csearch_path%3D...' works), and dispatches apply/list/rollback/mark
subcommands. Idempotent and safe to run concurrently (yoyo holds a PG
advisory lock while applying).

Note on _yoyo_migration table location: yoyo creates its tracking table in
whichever schema is first in the search_path. When running against two
different schemas on the same DB, each gets its own independent
_yoyo_migration tracker — this is the intended isolation behavior.
"""
from __future__ import annotations

import logging
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import click
from yoyo import get_backend, read_migrations

_LOG = logging.getLogger("celadon.migrate")
_YOYO_SCHEME = "postgresql+psycopg"


def _backend_and_migrations(database_url: str, migrations_dir: Path):
    parsed = urlparse(database_url)
    if parsed.scheme in ("postgres", "postgresql"):
        parsed = parsed._replace(scheme=_YOYO_SCHEME)
    elif parsed.scheme != _YOYO_SCHEME:
        raise click.UsageError(f"Unsupported DATABASE_URL scheme: {parsed.scheme!r}")
    return get_backend(urlunparse(parsed)), read_migrations(str(migrations_dir))


@click.group()
@click.option(
    "--database-url",
    envvar="DATABASE_URL",
    required=True,
    help="PostgreSQL connection URL.",
)
@click.option(
    "--log-level",
    envvar="CELADON_LOG_LEVEL",
    default="INFO",
    show_default=True,
    help="Logging level.",
)
@click.option(
    "--migrations-dir",
    envvar="CELADON_MIGRATIONS_DIR",
    default="/app/migrations",
    show_default=True,
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
    help="Directory containing migration files.",
)
@click.pass_context
def main(ctx: click.Context, database_url: str, log_level: str, migrations_dir: Path) -> None:
    logging.basicConfig(level=log_level, format="%(levelname)s %(name)s %(message)s")
    ctx.ensure_object(dict)
    ctx.obj = {"database_url": database_url, "migrations_dir": migrations_dir}


@main.command()
@click.pass_obj
def apply(obj: dict) -> None:
    """Apply all pending migrations."""
    backend, migrations = _backend_and_migrations(obj["database_url"], obj["migrations_dir"])
    with backend.lock():
        to_apply = backend.to_apply(migrations)
        if not to_apply:
            _LOG.info("No pending migrations.")
            return
        _LOG.info("Applying %d migration(s): %s", len(to_apply), [m.id for m in to_apply])
        backend.apply_migrations(to_apply)


@main.command(name="list")
@click.pass_obj
def list_cmd(obj: dict) -> None:
    """List migrations and their applied status (A=applied, U=unapplied)."""
    backend, migrations = _backend_and_migrations(obj["database_url"], obj["migrations_dir"])
    applied = {m.id for m in backend.to_rollback(migrations)}
    for m in migrations:
        click.echo(f"{'A' if m.id in applied else 'U'} {m.id}")


@main.command()
@click.option("--count", default=1, show_default=True, help="Number of migrations to roll back.")
@click.pass_obj
def rollback(obj: dict, count: int) -> None:
    """Roll back the last N applied migrations."""
    backend, migrations = _backend_and_migrations(obj["database_url"], obj["migrations_dir"])
    with backend.lock():
        to_roll = list(backend.to_rollback(migrations))[:count]
        if not to_roll:
            _LOG.info("Nothing to rollback.")
            return
        _LOG.info("Rolling back %d migration(s): %s", len(to_roll), [m.id for m in to_roll])
        backend.rollback_migrations(to_roll)


@main.command()
@click.argument("migration_id")
@click.pass_obj
def mark(obj: dict, migration_id: str) -> None:
    """Mark MIGRATION_ID as applied without running it."""
    backend, migrations = _backend_and_migrations(obj["database_url"], obj["migrations_dir"])
    target = next((m for m in migrations if m.id == migration_id), None)
    if target is None:
        raise click.BadParameter(f"Unknown migration: {migration_id}", param_hint="migration_id")
    with backend.lock():
        backend.mark_migrations([target])
    _LOG.info("Marked %s as applied without running.", target.id)
