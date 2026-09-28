from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    session_token: str
    ollama_url: str = "http://127.0.0.1:11434"

    @classmethod
    def from_environment(cls, data_dir: Path) -> "Settings":
        token = os.environ.get("JOBSCOUT_SESSION_TOKEN", "")
        if len(token) < 32:
            raise RuntimeError("A session token of at least 32 characters is required.")
        return cls(data_dir=data_dir, session_token=token)

