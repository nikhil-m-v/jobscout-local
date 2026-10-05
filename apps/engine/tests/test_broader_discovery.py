import asyncio
import json
from uuid import uuid4
import httpx
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.domain.search_plan import construct_search_plan
from jobscout_engine.domain.assistance import analyze_review
from jobscout_engine.broader_discovery import BroaderDiscovery
from jobscout_engine.adapters.tavily_search import TavilySearch, SEARCH_ENDPOINT
from test_discovery_api import app, CONFIRMATION, URL
from test_providers import MemorySecrets, KEY, HEADERS
from test_search import CRITERIA
from test_provider_connection import response
from test_tavily_search import ITEM


def confirmation(criteria=CRITERIA, run_id=None):
    plan = construct_search_plan(criteria)
    return {**CONFIRMATION, 'criteria': criteria, 'reviewed_query': plan['queries'][0],
            'reviewed_plan': plan, 'run_id': run_id or str(uuid4())}


def test_preview_and_full_bounded_pool_privacy_and_analysis(tmp_path, caplog):
    calls = []
    criteria = {**CRITERIA, 'region': 'india', 'arrangement': 'remote', 'skills': ['sql', 'python']}
    def handler(request):
        calls.append(request)
        return response({'results': [{**ITEM, 'url': f'https://jobs.example.com/{len(calls)}-{i}',
                                     'title': 'Software engineer', 'content': 'Hiring Python SQL developers.'} for i in range(10)]})
    store = MemorySecrets(); store.save(KEY)
    with TestClient(app(tmp_path, store, httpx.MockTransport(handler))) as client:
        client.put('/api/v1/profile', headers=HEADERS, json={'text': 'PRIVATE_NAME PRIVATE_HISTORY', 'reviewed': True})
        preview = client.post('/api/v1/search/plan', headers=HEADERS, json=criteria)
        assert preview.status_code == 200 and calls == []
        assert preview.json()['plan'] == construct_search_plan(criteria)
        value = confirmation(criteria)
        result = client.post(URL, headers=HEADERS, json=value)
        assert result.status_code == 200 and len(result.json()['candidates']) == 50
        assert result.json()['coverage'] == {'attempted': 5, 'completed': 5, 'max_requests': 5, 'stop_reason': 'complete', 'failures': []}
        assert len(calls) == 5
        for request, query in zip(calls, value['reviewed_plan']['queries']):
            body = json.loads(request.content)
            assert body['query'] == query and body['max_results'] == 10
            assert body['search_depth'] == 'basic' and body['auto_parameters'] is False
            assert body['include_raw_content'] is False and body['include_images'] is False
            assert str(request.url) == SEARCH_ENDPOINT
            assert 'PRIVATE_' not in request.content.decode() and KEY not in request.content.decode()
            assert 'India' in query and 'Remote' in query and 'Python SQL' in query
        assert 'PRIVATE_' not in caplog.text and KEY not in caplog.text
        analysis = client.post('/api/v1/assistance', headers=HEADERS, json={'text': 'Python SQL', 'reviewed': True,
                               'candidates': [{'title': c['title'], 'snippet': c['snippet']} for c in result.json()['candidates']]})
        assert analysis.status_code == 200 and len(analysis.json()['matches']) == 50
        progress = client.get(f"{URL}/{value['run_id']}", headers=HEADERS).json()
        assert progress == {'attempted': 5, 'completed': 5, 'max_requests': 5, 'busy': False}
        assert client.post(URL, headers=HEADERS, json=value).status_code == 503
        assert len(calls) == 5  # Reusing a consumed run cannot replay the batch.


def test_cross_response_tracking_duplicates_and_first_occurrence(tmp_path):
    calls = []
    def handler(request):
        calls.append(request)
        return response({'results': [{**ITEM, 'url': f'https://jobs.example.com/role?utm_source={len(calls)}', 'title': f'First {len(calls)}'}]})
    store = MemorySecrets(); store.save(KEY)
    with TestClient(app(tmp_path, store, httpx.MockTransport(handler))) as client:
        result = client.post(URL, headers=HEADERS, json=confirmation()).json()
        assert len(calls) == 5 and result['duplicates_removed'] == 4
        assert len(result['candidates']) == 1 and result['candidates'][0]['title'] == 'First 1'


@pytest.mark.parametrize('status,code', [(429, 'provider_rate_limited'), (432, 'provider_quota_exhausted'),
                                       (401, 'provider_invalid_key'), (500, 'provider_unavailable')])
def test_partial_failure_stops_without_retries_and_retains_results(tmp_path, status, code):
    calls = []
    def handler(request):
        calls.append(request)
        return response({'results': [ITEM]}) if len(calls) == 1 else response({'private': KEY}, status)
    store = MemorySecrets(); store.save(KEY)
    with TestClient(app(tmp_path, store, httpx.MockTransport(handler))) as client:
        result = client.post(URL, headers=HEADERS, json=confirmation()).json()
        assert len(calls) == 2 and len(result['candidates']) == 1
        assert result['coverage'] == {'attempted': 2, 'completed': 1, 'max_requests': 5, 'stop_reason': 'provider_failure', 'failures': [{'request': 2, 'code': code}]}
        assert KEY not in json.dumps(result)


def test_altered_plan_and_private_fields_fail_before_key_read_or_dispatch(tmp_path, monkeypatch):
    store = MemorySecrets(); store.save(KEY)
    monkeypatch.setattr(store, 'read', lambda: pytest.fail('Invalid plan accessed credential'))
    with TestClient(app(tmp_path, store, httpx.MockTransport(lambda request: pytest.fail('Invalid plan sent')))) as client:
        valid = confirmation()
        for plan in [{**valid['reviewed_plan'], 'max_requests': 6}, {**valid['reviewed_plan'], 'queries': ['PRIVATE_NAME'] * 5},
                     {**valid['reviewed_plan'], 'estimated_max_credits': True}, {**valid['reviewed_plan'], 'endpoint': 'https://collector.example.com'}]:
            assert client.post(URL, headers=HEADERS, json={**valid, 'reviewed_plan': plan}).status_code == 422
        for value in [{**valid, 'run_id': '../private'}, {**valid, 'profile': 'PRIVATE_NAME'},
                      {**valid, 'criteria': {**CRITERIA, 'resume': 'PRIVATE_NAME'}}]:
            assert client.post(URL, headers=HEADERS, json=value).status_code == 422


def test_cancel_active_request_keeps_completed_results_and_releases_lock(tmp_path):
    async def scenario():
        entered, stopped = asyncio.Event(), asyncio.Event()
        calls = []
        async def handler(request):
            calls.append(request)
            if len(calls) == 2:
                entered.set()
                try:
                    await asyncio.Event().wait()
                finally:
                    stopped.set()
            return response({'results': [ITEM]})
        store = MemorySecrets(); store.save(KEY)
        application = app(tmp_path, store, httpx.MockTransport(handler))
        value = confirmation()
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=application), base_url='http://local') as client:
            task = asyncio.create_task(client.post(URL, headers=HEADERS, json=value))
            await asyncio.wait_for(entered.wait(), 2)
            progress = (await client.get(f"{URL}/{value['run_id']}", headers=HEADERS)).json()
            assert progress == {'attempted': 2, 'completed': 1, 'max_requests': 5, 'busy': True}
            assert (await client.post(URL, headers=HEADERS, json=confirmation())).status_code == 409
            assert (await client.post(f"{URL}/{value['run_id']}/cancel", headers=HEADERS)).status_code == 200
            result = (await asyncio.wait_for(task, 2)).json()
            assert stopped.is_set() and len(calls) == 2
            assert result['coverage']['stop_reason'] == 'cancelled' and len(result['candidates']) == 1
            assert (await client.post(URL, headers=HEADERS, json=CONFIRMATION)).status_code == 200
    asyncio.run(scenario())


def test_cancel_before_dispatch_and_control_auth(tmp_path):
    store = MemorySecrets(); store.save(KEY)
    with TestClient(app(tmp_path, store, httpx.MockTransport(lambda request: pytest.fail('Cancelled plan sent')))) as client:
        value = confirmation()
        path = f"{URL}/{value['run_id']}"
        assert client.get(path).status_code == 401
        assert client.post(path + '/cancel').status_code == 401
        assert client.post(path + '/cancel', headers=HEADERS).status_code == 200
        result = client.post(URL, headers=HEADERS, json=value).json()
        assert result['coverage']['attempted'] == 0 and result['coverage']['stop_reason'] == 'cancelled'


def test_overall_time_limit_cancels_wait_and_retains_prior_results(monkeypatch):
    import jobscout_engine.broader_discovery as module
    monkeypatch.setattr(module, 'PLAN_SECONDS', .02)
    async def scenario():
        calls = []
        async def handler(request):
            calls.append(request)
            if len(calls) == 2:
                await asyncio.sleep(1)
            return response({'results': [ITEM]})
        service = BroaderDiscovery(TavilySearch(transport=httpx.MockTransport(handler)))
        result = await service.run(CRITERIA, KEY, str(uuid4()))
        assert result['coverage']['stop_reason'] == 'time_limit'
        assert len(result['candidates']) == 1 and len(calls) == 2
        assert service.progress['busy'] is False
    asyncio.run(scenario())


def test_empty_responses_have_honest_coverage(tmp_path):
    store = MemorySecrets(); store.save(KEY)
    with TestClient(app(tmp_path, store, httpx.MockTransport(lambda request: response({'results': []})))) as client:
        result = client.post(URL, headers=HEADERS, json=confirmation()).json()
        assert result['candidates'] == [] and result['coverage']['completed'] == 5


@pytest.mark.parametrize('variant,query,criteria', [(-1, 'Software engineer jobs', CRITERIA),
    (5, 'Software engineer careers', CRITERIA), (True, 'Software engineer job openings', CRITERIA),
    (1, 'PRIVATE_NAME', CRITERIA), (1, 'Software engineer job openings', {**CRITERIA, 'notes': 'PRIVATE_NAME'})])
def test_adapter_revalidates_variant_and_public_criteria(variant, query, criteria):
    adapter = TavilySearch(transport=httpx.MockTransport(lambda request: pytest.fail('Invalid variant sent')))
    from jobscout_engine.domain.discovery import DiscoveryFailure
    with pytest.raises(DiscoveryFailure):
        asyncio.run(adapter.search_variant(criteria, key=KEY, reviewed_query=query, variant=variant))


def test_malformed_later_response_stops_and_preserves_safe_results(tmp_path):
    calls = []
    def handler(request):
        calls.append(request)
        return response({'results': [ITEM]}) if len(calls) == 1 else response({'results': [{**ITEM, 'url': 'https://localhost/private'}]})
    store = MemorySecrets(); store.save(KEY)
    with TestClient(app(tmp_path, store, httpx.MockTransport(handler))) as client:
        result = client.post(URL, headers=HEADERS, json=confirmation()).json()
        assert len(calls) == 2 and len(result['candidates']) == 1
        assert result['coverage']['failures'] == [{'request': 2, 'code': 'provider_invalid_response'}]
