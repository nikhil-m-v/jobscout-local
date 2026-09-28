from pathlib import Path
import sqlite3


class Database:
    """Owns local persistence; application routes do not construct SQL."""

    def __init__(self, data_dir: Path):
        self.path = data_dir / "jobscout.db"

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.path) as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute(
                "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)"
            )
            connection.execute("INSERT OR IGNORE INTO schema_version VALUES (1)")

    def is_ready(self) -> bool:
        try:
            with sqlite3.connect(self.path) as connection:
                return connection.execute(
                    "SELECT version FROM schema_version WHERE version = 1"
                ).fetchone() == (1,)
        except sqlite3.Error:
            return False

