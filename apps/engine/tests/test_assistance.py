import json
import httpx
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.domain.assistance import analyze_review
from jobscout_engine.domain.search import construct_public_query
from jobscout_engine.storage import Database
from test_discovery_api import app, URL, CONFIRMATION
from test_providers import HEADERS, MemorySecrets, KEY
from test_provider_connection import response
from test_tavily_search import VALID


def review(text, candidates=None):
    return {'text': text, 'reviewed': True, 'candidates': candidates or []}


def test_different_reviewed_profiles_produce_different_controlled_queries():
    developer = analyze_review(review('PRIVATE_NAME Software engineer\nTypeScript React JavaScript SQL Python AWS'))
    analyst = analyze_review(review('PRIVATE_NAME Data analyst\nSQL Tableau Python'))
    assert construct_public_query(developer['criteria']) != construct_public_query(analyst['criteria'])
    assert developer['criteria']['skills'] == ['typescript', 'react', 'javascript', 'sql', 'python']
    assert analyst['criteria']['role'] == 'data-analyst'
    assert analyst['criteria']['region'] == analyst['criteria']['seniority'] == 'any'
    assert 'PRIVATE_NAME' not in json.dumps(developer)


def test_no_role_does_not_fabricate_a_default_or_infer_private_preferences():
    result = analyze_review(review('PRIVATE_NAME lives in India. Senior Python hobbyist. JavaScript NoSQL.'))
    assert result['criteria'] is None and result['roles'] == []
    assert result['skills'] == ['python', 'javascript']  # No Java/SQL substring matches.
    assert analyze_review(review('')) == {'criteria': None, 'roles': [], 'skills': [], 'matches': []}


def test_job_category_evidence_is_bounded_and_profile_specific():
    candidates = [{'title': 'Software engineer - remote India', 'snippet': 'Python SQL senior'},
                  {'title': 'Data analyst', 'snippet': 'Tableau hybrid Canada junior'}]
    result = analyze_review(review('Data analyst Python Tableau', candidates))
    first, second = result['matches']
    assert first == {'index': 0, 'roles': ['software-engineer'], 'skills': ['python', 'sql'], 'shared_skills': ['python'],
                     'regions': ['india'], 'arrangements': ['remote'], 'seniorities': ['senior']}
    assert second['skills'] == ['analytics'] and second['regions'] == ['canada']
    assert second['seniorities'] == ['entry']
    assert second['shared_skills'] == ['analytics']
    developer = analyze_review(review('Software engineer Python SQL', candidates))
    analyst = analyze_review(review('Data analyst Tableau', candidates))
    assert [len(item['shared_skills']) for item in developer['matches']] == [2, 0]
    assert [len(item['shared_skills']) for item in analyst['matches']] == [0, 1]


@pytest.mark.parametrize('value', [None, {}, review('x') | {'reviewed': False}, review('x') | {'query': 'private'},
    review('x' * 200001), review('x\x00'), review('\ud800'),
    review('x', [{'title': 'x', 'snippet': '', 'url': 'https://collector.example.com'}]),
    review('x', [{'title': 'x' * 513, 'snippet': ''}]),
    review('x', [{'title': 'x', 'snippet': ''}] * 11)])
def test_local_assistance_rejects_unbounded_or_unreviewed_inputs(value):
    with pytest.raises((ValueError, UnicodeError)):
        analyze_review(value)


def test_authenticated_local_analysis_then_preview_dispatch_never_sends_private_text(tmp_path, monkeypatch, caplog):
    captured = []
    def transport(request):
        captured.append(request)
        return response(VALID)
    store = MemorySecrets(); store.save(KEY)
    def forbidden(*args, **kwargs):
        raise AssertionError('Local assistance touched profile storage')
    monkeypatch.setattr(Database, 'load_profile', forbidden)
    monkeypatch.setattr(Database, 'save_profile', forbidden)
    with TestClient(app(tmp_path, store, httpx.MockTransport(transport))) as client:
        data = review('PRIVATE_NAME PRIVATE_EMAIL PRIVATE_EMPLOYER Software engineer Python SQL')
        assert client.post('/api/v1/assistance', json=data).status_code == 401
        local = client.post('/api/v1/assistance', headers=HEADERS, json=data)
        assert local.status_code == 200 and local.headers['cache-control'] == 'no-store'
        assert captured == [] and 'PRIVATE_' not in local.text
        criteria = local.json()['criteria']
        preview = client.post('/api/v1/search/preview', headers=HEADERS, json=criteria).json()
        assert captured == []
        assert client.post(URL, headers=HEADERS, json={**CONFIRMATION, 'criteria': criteria, 'reviewed_query': preview['query']}).status_code == 200
        assert len(captured) == 1
        assert json.loads(captured[0].content)['query'] == 'Software engineer jobs Python SQL'
        assert 'PRIVATE_' not in captured[0].content.decode() and 'PRIVATE_' not in caplog.text
        bad = client.post('/api/v1/assistance', headers=HEADERS, json={**data, 'reviewed': False})
        assert bad.status_code == 422 and bad.json() == {'error': 'invalid_local_review'}
        assert 'PRIVATE_' not in bad.text
        assert client.post('/api/v1/assistance', headers={**HEADERS, 'Content-Type': 'text/plain'}, json=data).status_code == 422


def test_local_route_rejects_duplicate_keys_and_oversized_bodies_without_echo(tmp_path):
    with TestClient(app(tmp_path, MemorySecrets(), httpx.MockTransport(lambda request: pytest.fail('Unexpected provider call')))) as client:
        for raw in [b'{"text":"PRIVATE_ONE","text":"PRIVATE_TWO","reviewed":true,"candidates":[]}', b'x' * 2_300_001]:
            result = client.post('/api/v1/assistance', headers=HEADERS, content=raw)
            assert result.status_code == 422 and result.json() == {'error': 'invalid_local_review'}
            assert result.headers['cache-control'] == 'no-store'
