from pathlib import Path
import sqlite3
from datetime import datetime, timezone
from contextlib import closing


class Database:
    """Owns local persistence; application routes do not construct SQL."""

    def __init__(self, data_dir: Path):
        self.path = data_dir / "jobscout.db"

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute("PRAGMA journal_mode=DELETE")
            connection.execute("PRAGMA secure_delete=ON")
            connection.execute("CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY CHECK (id = 1), text TEXT NOT NULL, saved_at TEXT NOT NULL)")
            connection.execute(
                "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)"
            )
            connection.execute("INSERT OR IGNORE INTO schema_version VALUES (1)")

    def is_ready(self) -> bool:
        try:
            with closing(sqlite3.connect(self.path)) as connection, connection:
                return connection.execute(
                    "SELECT version FROM schema_version WHERE version = 1"
                ).fetchone() == (1,)
        except sqlite3.Error:
            return False


    def load_profile(self) -> dict | None:
        with closing(sqlite3.connect(self.path)) as connection, connection:
            row = connection.execute("SELECT text, saved_at FROM profile WHERE id = 1").fetchone()
        return {"text": row[0], "saved_at": row[1]} if row else None

    def save_profile(self, text: str) -> dict:
        saved_at = datetime.now(timezone.utc).isoformat()
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute("PRAGMA secure_delete=ON")
            connection.execute("INSERT INTO profile VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET text=excluded.text, saved_at=excluded.saved_at", (text, saved_at))
        return {"text": text, "saved_at": saved_at}

    def delete_profile(self) -> None:
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute("PRAGMA secure_delete=ON")
            connection.execute("DELETE FROM profile")
