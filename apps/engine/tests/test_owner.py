import os
from pathlib import Path
import subprocess
import sys
import pytest


@pytest.mark.skipif(os.name != "nt", reason="Windows desktop ownership")
def test_engine_exits_when_owner_exits(tmp_path):
    owner = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])
    environment = {**os.environ, "JOBSCOUT_SESSION_TOKEN": "synthetic-owner-test-token-32-characters"}
    engine = subprocess.Popen(
        [sys.executable, "-m", "jobscout_engine", "--data-dir", str(tmp_path),
         "--owner-pid", str(owner.pid)],
        env=environment, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )
    try:
        import queue
        import threading
        output = queue.Queue()
        threading.Thread(target=lambda: output.put(engine.stdout.readline()), daemon=True).start()
        line = output.get(timeout=15)
        assert b'"event": "bound"' in line
        owner.terminate()
        owner.wait(timeout=5)
        assert engine.wait(timeout=10) == 0
        assert (Path(tmp_path) / "jobscout.db").exists()
    finally:
        if engine.poll() is None:
            engine.kill()
        engine.wait(timeout=5)
        if owner.poll() is None:
            owner.kill()
        owner.wait(timeout=5)
