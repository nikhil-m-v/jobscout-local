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
    parser.add_argument("--owner-pid", type=int)
    arguments = parser.parse_args()
    application = create_app(Settings.from_environment(arguments.data_dir))
    # Bind before the handshake; using an OS-assigned port prevents conflicts.
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", arguments.port))
        listener.listen(128)
        listener.setblocking(False)
        configuration = uvicorn.Config(application, log_level="warning", access_log=False,
                                       timeout_graceful_shutdown=3)
        server = uvicorn.Server(configuration)
        finished = None
        if arguments.owner_pid is not None:
            from jobscout_engine.owner import watch_owner
            finished = watch_owner(arguments.owner_pid, server)
        try:
            print(json.dumps({"event": "bound", "port": listener.getsockname()[1]}), flush=True)
            server.run(sockets=[listener])
        finally:
            if finished is not None:
                finished.set()


if __name__ == "__main__":
    from multiprocessing import freeze_support
    freeze_support()
    main()

