"""Cancel disposable work before the HTTP server drains active requests."""
import uvicorn


class EngineServer(uvicorn.Server):
    def __init__(self, config, begin_shutdown):
        super().__init__(config)
        self.begin_shutdown = begin_shutdown

    async def shutdown(self, sockets=None):
        # Uvicorn calls this on its event loop after owner loss or a stop signal.
        # Lifespan shutdown alone is too late: it follows the active-request wait.
        self.begin_shutdown()
        await super().shutdown(sockets=sockets)
