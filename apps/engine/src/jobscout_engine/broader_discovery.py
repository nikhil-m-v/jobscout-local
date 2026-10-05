"""Session-only sequential discovery; one active run, bounded cancellation memory."""
import asyncio
from collections import deque
from datetime import datetime, timezone
from jobscout_engine.domain.discovery import DiscoveryFailure
from jobscout_engine.domain.search import construct_public_query
from jobscout_engine.domain.search_plan import construct_search_plan, PLAN_SECONDS


class BroaderDiscovery:
    def __init__(self, provider):
        self.provider = provider
        self.current_id = None
        self.cancel_event = None
        self.progress = None
        self.cancelled = deque(maxlen=32)
        self.used = deque(maxlen=32)

    def cancel(self, run_id):
        if run_id not in self.cancelled:
            self.cancelled.append(run_id)
        if run_id == self.current_id and self.cancel_event:
            self.cancel_event.set()

    async def run(self, criteria, key, run_id):
        if run_id in self.used:
            raise DiscoveryFailure('search_confirmation_required')
        self.used.append(run_id)
        plan = construct_search_plan(criteria)
        self.current_id = run_id
        self.cancel_event = asyncio.Event()
        if run_id in self.cancelled:
            self.cancel_event.set()
        self.progress = {'attempted': 0, 'completed': 0, 'max_requests': 5, 'busy': True}
        candidates, seen, duplicates, failures = [], set(), 0, []
        stop_reason = 'complete'
        deadline = asyncio.get_running_loop().time() + PLAN_SECONDS
        try:
            for index, query in enumerate(plan['queries']):
                if self.cancel_event.is_set():
                    stop_reason = 'cancelled'
                    break
                remaining = deadline - asyncio.get_running_loop().time()
                if remaining <= 0:
                    stop_reason = 'time_limit'
                    break
                self.progress['attempted'] += 1
                request = asyncio.create_task(self.provider.search_variant(
                    criteria, key=key, reviewed_query=query, variant=index))
                cancel = asyncio.create_task(self.cancel_event.wait())
                try:
                    done, _ = await asyncio.wait({request, cancel}, timeout=remaining,
                                                 return_when=asyncio.FIRST_COMPLETED)
                    if cancel in done or request not in done:
                        stop_reason = 'cancelled' if cancel in done else 'time_limit'
                        break
                    try:
                        result = request.result()
                    except DiscoveryFailure as error:
                        failures.append({'request': index + 1, 'code': error.code})
                        # Do not retry or spend more after provider failure.
                        stop_reason = 'provider_failure'
                        break
                    self.progress['completed'] += 1
                    duplicates += result.duplicates_removed
                    for candidate in result.candidates:
                        if candidate.url in seen:
                            duplicates += 1
                        else:
                            seen.add(candidate.url)
                            candidates.append({'title': candidate.title, 'url': candidate.url,
                                               'snippet': candidate.snippet})
                finally:
                    for task in (request, cancel):
                        if not task.done():
                            task.cancel()
                    await asyncio.gather(request, cancel, return_exceptions=True)
        finally:
            self.progress['busy'] = False
        return {'query': construct_public_query(criteria), 'provider': 'tavily',
                'candidates': candidates, 'duplicates_removed': duplicates,
                'retrieved_at': datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
                'coverage': {'attempted': self.progress['attempted'], 'completed': self.progress['completed'],
                             'max_requests': 5, 'stop_reason': stop_reason, 'failures': failures}}
