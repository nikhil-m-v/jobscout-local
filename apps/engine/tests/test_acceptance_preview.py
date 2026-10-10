"""The interactive harness must exercise production contracts without live access."""
import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from jobscout_engine.adapters.secrets import SecretStoreUnavailable
from jobscout_engine.domain.search_plan import construct_search_plan
from jobscout_engine.storage import Database
from test_search import CRITERIA
from test_providers import HEADERS

spec = importlib.util.spec_from_file_location('acceptance_engine', Path(__file__).resolve().parents[3] / 'scripts/acceptance_engine.py')
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)


@pytest.mark.parametrize('scenario,completed,attempted', [('complete', 5, 5), ('failure', 1, 2)])
def test_harness_dispatch_is_synthetic_bounded_and_private(tmp_path, monkeypatch, scenario, completed, attempted):
    def forbidden(*args, **kwargs):
        raise AssertionError('Synthetic preview accessed real vault or profile during discovery')
    monkeypatch.setattr('jobscout_engine.app.create_secret_store', forbidden)
    application, calls = harness.create_synthetic_app(tmp_path, 'synthetic-token', scenario, delay=0)
    with TestClient(application) as client:
        client.put('/api/v1/profile', headers=HEADERS, json={'text': 'PRIVATE_NAME PRIVATE_CAREER Python', 'reviewed': True})
        monkeypatch.setattr(Database, 'load_profile', forbidden)
        plan = construct_search_plan(CRITERIA)
        assert client.post('/api/v1/search/plan', headers=HEADERS, json=CRITERIA).status_code == 200
        assert calls == []
        result = client.post('/api/v1/search', headers=HEADERS, json={
            'criteria': CRITERIA, 'provider': 'tavily', 'query_version': 1,
            'reviewed_query': plan['queries'][0], 'reviewed_plan': plan,
            'confirmed': True, 'run_id': str(uuid4()),
        }).json()
        assert result['coverage']['completed'] == completed
        assert result['coverage']['attempted'] == attempted
        assert len(result['candidates']) == completed * 10
        assert len(calls) == attempted
        assert 'PRIVATE_' not in str(calls) and harness.KEY not in str(calls)
        assert 'PRIVATE_' not in str(result) and harness.KEY not in str(result)
        for body, source in zip(calls, plan['sources']):
            assert body['include_domains'] == source['domains']
            assert body['query'] == plan['queries'][0]
        assert client.post('/api/v1/providers/tavily/check', headers=HEADERS, json={'confirmed': True}).json()['error'] == 'provider_invalid_key'


def test_harness_refuses_real_credentials():
    store = harness.SyntheticSecrets()
    with pytest.raises(SecretStoreUnavailable):
        store.save('tvly-not-a-synthetic-key')
    assert store.read() == harness.KEY
