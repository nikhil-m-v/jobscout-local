"""Local operations release SQLite handles without relying on garbage collection."""
import sqlite3

import pytest

from jobscout_engine.storage import Database


def test_operations_close_connections_and_preserve_transactions(tmp_path, monkeypatch):
    original = sqlite3.connect
    connections = []

    def tracked(*args, **kwargs):
        connection = original(*args, **kwargs)
        connections.append(connection)
        return connection

    monkeypatch.setattr('jobscout_engine.storage.sqlite3.connect', tracked)
    database = Database(tmp_path)
    operations = [database.initialize, database.is_ready, database.load_profile,
                  lambda: database.save_profile('SYNTHETIC_REVIEWED_TEXT'),
                  database.load_profile, database.delete_profile, database.load_profile]
    results = []
    for operation in operations:
        results.append(operation())
        assert len(connections) == len(results)
        with pytest.raises(sqlite3.ProgrammingError, match='closed'):
            connections[-1].execute('SELECT 1')
    assert results[1] is True
    assert results[2] is None
    assert results[4] == results[3]
    assert results[4]['text'] == 'SYNTHETIC_REVIEWED_TEXT'
    assert results[6] is None
    database.path.unlink()


def test_failed_write_rolls_back_and_closes_connection(tmp_path, monkeypatch):
    database = Database(tmp_path)
    database.initialize()
    original = sqlite3.connect
    connections = []

    class FailingConnection(sqlite3.Connection):
        def execute(self, sql, parameters=()):
            result = super().execute(sql, parameters)
            if sql.startswith('INSERT INTO profile'):
                raise sqlite3.OperationalError('synthetic failure after write')
            return result

    def failing(*args, **kwargs):
        connection = original(*args, **kwargs, factory=FailingConnection)
        connections.append(connection)
        return connection

    with monkeypatch.context() as patch:
        patch.setattr('jobscout_engine.storage.sqlite3.connect', failing)
        with pytest.raises(sqlite3.OperationalError, match='synthetic failure'):
            database.save_profile('SYNTHETIC_UNCOMMITTED_TEXT')
    with pytest.raises(sqlite3.ProgrammingError, match='closed'):
        connections[0].execute('SELECT 1')
    assert database.load_profile() is None
