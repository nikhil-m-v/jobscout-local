from pathlib import Path
import sqlite3
from datetime import datetime, timezone
from contextlib import closing
import json
from uuid import uuid4
from jobscout_engine.domain.saved_jobs import MAX_SAVED_JOBS, SavedJobsFull


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
            connection.execute("CREATE TABLE IF NOT EXISTS saved_jobs (id TEXT PRIMARY KEY, url TEXT NOT NULL UNIQUE, snapshot TEXT NOT NULL, saved_at TEXT NOT NULL)")
            connection.execute("INSERT OR IGNORE INTO schema_version VALUES (2)")

    def is_ready(self) -> bool:
        try:
            with closing(sqlite3.connect(self.path)) as connection, connection:
                return connection.execute(
                    "SELECT version FROM schema_version WHERE version = 2"
                ).fetchone() == (2,)
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

    @staticmethod
    def _job_record(row) -> dict:
        return {**json.loads(row[2]), 'id': row[0], 'saved_at': row[3]}

    def load_jobs(self) -> list[dict]:
        with closing(sqlite3.connect(self.path)) as connection, connection:
            rows = connection.execute("SELECT id, url, snapshot, saved_at FROM saved_jobs ORDER BY saved_at DESC, id").fetchall()
        return [self._job_record(row) for row in rows]

    def save_job(self, snapshot: dict) -> dict:
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute("PRAGMA secure_delete=ON")
            # Serialize the limit and duplicate check with the write, across connections.
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute("SELECT id, url, snapshot, saved_at FROM saved_jobs WHERE url = ?", (snapshot['url'],)).fetchone()
            if row:
                return self._job_record(row)  # Keep the original snapshot and timestamp.
            if connection.execute("SELECT COUNT(*) FROM saved_jobs").fetchone()[0] >= MAX_SAVED_JOBS:
                raise SavedJobsFull()
            record = {**snapshot, 'id': str(uuid4()), 'saved_at': datetime.now(timezone.utc).isoformat()}
            connection.execute("INSERT INTO saved_jobs VALUES (?, ?, ?, ?)",
                               (record['id'], snapshot['url'], json.dumps(snapshot), record['saved_at']))
        return record

    def delete_job(self, job_id: str) -> None:
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute("PRAGMA secure_delete=ON")
            connection.execute("DELETE FROM saved_jobs WHERE id = ?", (job_id,))
