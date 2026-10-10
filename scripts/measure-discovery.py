"""Measure local discovery responsiveness with synthetic transports; no live mode."""
import argparse
import asyncio
import json
from pathlib import Path
import socket
import statistics
import tempfile
import time
from uuid import uuid4

import httpx
import uvicorn

from acceptance_engine import create_synthetic_app
from jobscout_engine.domain.search_plan import construct_search_plan

CRITERIA = dict(role='software-engineer', region='india', seniority='any',
                arrangement='remote', skills=['python', 'sql'])


async def measure(scenario):
    # One-second mock waits make concurrent endpoint checks meaningful.
    with tempfile.TemporaryDirectory(prefix='jobscout-responsiveness-') as directory:
        token = uuid4().hex
        application, calls = create_synthetic_app(Path(directory), token,
                                                  'failure' if scenario == 'failure' else 'complete', delay=1)
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.bind(('127.0.0.1', 0))
            listener.listen(128)
            listener.setblocking(False)
            server = uvicorn.Server(uvicorn.Config(application, log_level='error',
                                   access_log=False, lifespan='on', timeout_graceful_shutdown=2))
            serving = asyncio.create_task(server.serve(sockets=[listener]))
            search = None
            try:
                async with asyncio.timeout(5):
                    while not server.started:
                        if serving.done():
                            await serving
                            raise RuntimeError('Synthetic server did not start')
                        await asyncio.sleep(.01)
                async with httpx.AsyncClient(base_url=f'http://127.0.0.1:{listener.getsockname()[1]}',
                           headers={'Authorization': f'Bearer {token}'}, trust_env=False, timeout=10) as client:
                    plan = construct_search_plan(CRITERIA)
                    run_id = str(uuid4())
                    started = time.perf_counter()
                    search = asyncio.create_task(client.post('/api/v1/search', json={
                        'criteria': CRITERIA, 'provider': 'tavily', 'query_version': 1,
                        'reviewed_query': plan['queries'][0], 'reviewed_plan': plan,
                        'confirmed': True, 'run_id': run_id,
                    }))
                    health_ms, progress_ms = [], []
                    cancelled_at = cancel_ack_ms = None
                    async with asyncio.timeout(9):
                        while not search.done():
                            before = time.perf_counter()
                            health = await client.get('/api/v1/health')
                            health.raise_for_status()
                            health_ms.append((time.perf_counter() - before) * 1000)
                            before = time.perf_counter()
                            progress = await client.get(f'/api/v1/search/{run_id}')
                            if progress.status_code == 200:
                                progress_ms.append((time.perf_counter() - before) * 1000)
                                counts = progress.json()
                                if scenario == 'cancel' and cancelled_at is None and counts['completed'] == 1 and counts['attempted'] == 2:
                                    cancelled_at = time.perf_counter()
                                    acknowledgement = await client.post(f'/api/v1/search/{run_id}/cancel')
                                    acknowledgement.raise_for_status()
                                    assert acknowledgement.json() == {'cancelled': True}
                                    cancel_ack_ms = (time.perf_counter() - cancelled_at) * 1000
                                    # Await the result directly: do not count our polling pause.
                                    break
                            elif progress.status_code != 404:
                                progress.raise_for_status()
                            await asyncio.sleep(.05)
                        response = await search
                    finished = time.perf_counter()
                    response.raise_for_status()
                    result = response.json()
                    expected = {'complete': (5, 5, 50), 'failure': (1, 2, 10), 'cancel': (1, 2, 10)}[scenario]
                    coverage = result['coverage']
                    assert (coverage['completed'], coverage['attempted'], len(result['candidates'])) == expected
                    assert len(calls) == expected[1]
                    assert len(health_ms) > 1 and len(progress_ms) > 1
                    if scenario == 'cancel':
                        assert cancelled_at is not None
                    return {'scenario': scenario, 'duration_seconds': round(finished - started, 3),
                            'completed': expected[0], 'attempted': expected[1], 'retained_links': expected[2],
                            'health': latency(health_ms), 'progress': latency(progress_ms),
                            'cancel_ack_ms': round(cancel_ack_ms, 2) if cancel_ack_ms is not None else None,
                            'cancel_to_results_ms': round((finished - cancelled_at) * 1000, 2) if cancelled_at is not None else None}
            finally:
                if search is not None and not search.done():
                    search.cancel()
                    await asyncio.gather(search, return_exceptions=True)
                server.should_exit = True
                await asyncio.wait_for(serving, timeout=5)


def latency(values):
    return {'samples': len(values), 'median_ms': round(statistics.median(values), 2),
            'maximum_ms': round(max(values), 2)}


async def main(runs):
    samples = []
    for _ in range(runs):
        for scenario in ('complete', 'cancel', 'failure'):
            samples.append(await measure(scenario))
    print(json.dumps({'scope': 'Development Python engine and benchmark client on one event loop; real authenticated loopback HTTP, one-second mock provider waits, fresh temporary storage. No real vault/provider/model/page access. Not packaged/native rendering, RAM, live latency or billing.',
                      'runs_per_scenario': runs, 'samples': samples}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runs', type=int, choices=range(1, 4), default=3)
    asyncio.run(main(parser.parse_args().runs))
