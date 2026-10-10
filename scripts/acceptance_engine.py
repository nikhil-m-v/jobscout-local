"""Development-only, synthetic acceptance server. Never uses a live provider/vault."""
import argparse
import asyncio
import json
from pathlib import Path
import socket
import tempfile

import httpx
import uvicorn
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.adapters.tavily import TavilyConnection
from jobscout_engine.adapters.tavily_search import TavilySearch, SEARCH_ENDPOINT
from jobscout_engine.domain.contracts import ModelStatus

KEY = 'tvly-SYNTHETIC-ACCEPTANCE-NOT-A-REAL-KEY'


def mock_response(data, status=200):
    return httpx.Response(status, headers={'Content-Type': 'application/json'},
                          stream=httpx.ByteStream(json.dumps(data).encode()))


class SyntheticSecrets:
    def __init__(self):
        self.key = KEY

    def contains(self):
        return self.key is not None

    def read(self):
        return self.key

    def save(self, key):
        # Do not accept real credentials even in this disposable workspace.
        if key != KEY:
            from jobscout_engine.adapters.secrets import SecretStoreUnavailable
            raise SecretStoreUnavailable()
        self.key = KEY

    def delete(self):
        self.key = None


class OfflineModel:
    async def health(self):
        return ModelStatus(provider='ollama', status='unavailable')


def synthetic_items(index):
    base = f'https://boards.greenhouse.io/synthetic{index}'
    rows = [
        ('Senior software engineer', 'Hiring Python SQL engineers. Location: India. Work mode: Remote.', '/jobs/1'),
        ('Senior software engineer', 'Hiring Python SQL engineers. Location: India. Work mode: Remote.', '/jobs/2'),
        ('Software engineer', 'Hiring Python engineers. Location: United States. Work mode: Remote.', '/jobs/3'),
        ('Data analyst', 'Hiring SQL analysts. Location: India. Remote.', '/jobs/4'),
        ('Software engineer', 'Python team. Details to follow.', '/jobs/5'),
        ('Software engineer', 'Work mode: Remote. Work mode: On-site. Location: India.', '/jobs/6'),
        ('Python course', 'Learn Python with our training guide.', '/jobs/7'),
        ('Software engineering jobs', 'Browse all jobs and open positions.', '/jobs/8'),
        ('Software engineer <script>alert(1)</script>', 'Hiring Python engineers. <img src="https://tracker.example/pixel">', '/jobs/9'),
        ('Careers', 'Browse all open positions at our company.', ''),
    ]
    return [{'title': title, 'content': content, 'url': base + suffix} for title, content, suffix in rows]


def create_synthetic_app(data_dir, token, scenario='complete', delay=6):
    calls = []

    async def search(request):
        if str(request.url) != SEARCH_ENDPOINT or request.method != 'POST':
            raise AssertionError('Unexpected mock destination')
        body = json.loads(request.content)
        # Retain only synthetic outbound public payloads, never authorization.
        calls.append(body)
        await asyncio.sleep(delay)
        if scenario == 'failure' and len(calls) % 2 == 0:
            return mock_response({'error': 'synthetic rate limit'}, 429)
        return mock_response({'results': synthetic_items(len(calls))})

    async def connection(request):
        return mock_response({}, 401)

    application = create_app(
        Settings(data_dir=data_dir, session_token=token), OfflineModel(),
        secret_store=SyntheticSecrets(),
        provider_connection=TavilyConnection(transport=httpx.MockTransport(connection)),
        search_provider=TavilySearch(transport=httpx.MockTransport(search)),
    )
    return application, calls


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scenario', choices=['complete', 'failure'], default='complete')
    parser.add_argument('--owner-pid', type=int, required=True)
    args = parser.parse_args()
    # This entry point has no existing-data-dir or real-provider option.
    with tempfile.TemporaryDirectory(prefix='jobscout-synthetic-') as directory:
        settings = Settings.from_environment(Path(directory))
        application, _ = create_synthetic_app(settings.data_dir, settings.session_token, args.scenario)
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.bind(('127.0.0.1', 0))
            listener.listen(128)
            listener.setblocking(False)
            server = uvicorn.Server(uvicorn.Config(application, log_level='warning', access_log=False,
                                                  timeout_graceful_shutdown=3))
            from jobscout_engine.owner import watch_owner
            finished = watch_owner(args.owner_pid, server)
            try:
                print(json.dumps({'event': 'bound', 'port': listener.getsockname()[1]}), flush=True)
                server.run(sockets=[listener])
            finally:
                finished.set()


if __name__ == '__main__':
    main()
