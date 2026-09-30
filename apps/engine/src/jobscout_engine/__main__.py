import argparse
import json
from pathlib import Path
import socket
import uvicorn
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings


def main() -> None:
    parser = argparse.ArgumentParser(description="JobScout local engine")
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--data-dir", type=Path, required=True)
    arguments = parser.parse_args()
    application = create_app(Settings.from_environment(arguments.data_dir))
    # Bind before the handshake; using an OS-assigned port prevents conflicts.
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", arguments.port))
        listener.listen(128)
        listener.setblocking(False)
        print(json.dumps({"event": "bound", "port": listener.getsockname()[1]}), flush=True)
        configuration = uvicorn.Config(application, log_level="warning", access_log=False)
        uvicorn.Server(configuration).run(sockets=[listener])


if __name__ == "__main__":
    from multiprocessing import freeze_support
    freeze_support()
    main()

