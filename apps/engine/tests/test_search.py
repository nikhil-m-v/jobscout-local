import json
import re
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.domain.search import (
    construct_public_query, validate_public_search_criteria, InvalidSearchCriteria,
    ROLES, REGIONS, SENIORITIES, ARRANGEMENTS, SKILLS,
)
from jobscout_engine.storage import Database
from test_health import OfflineModel

CRITERIA = dict(role='software-engineer', region='any', seniority='any', arrangement='any', skills=[])
HEADERS = {'Authorization': 'Bearer synthetic-token', 'Content-Type': 'application/json'}
URL = '/api/v1/search/preview'


def test_query_is_deterministic_and_omits_unspecified_preferences():
    assert construct_public_query(CRITERIA) == 'Software engineer jobs'
    criteria = {**CRITERIA, 'region': 'india', 'seniority': 'senior', 'arrangement': 'remote', 'skills': ['sql', 'python']}
    expected = 'Software engineer jobs India Senior Remote Python SQL'
    assert construct_public_query(criteria) == expected
    assert construct_public_query({**criteria, 'skills': ['python', 'sql']}) == expected
    snapshot = validate_public_search_criteria(criteria)
    criteria['skills'].append('java')
    assert snapshot.skills == ('python', 'sql')
    with pytest.raises(InvalidSearchCriteria):
        construct_public_query(snapshot)  # Types alone are never trusted.


@pytest.mark.parametrize('payload', [
    None, [], 'SYNTHETIC_PRIVATE', {}, {**CRITERIA, 'profile': 'SYNTHETIC_PRIVATE'},
    {**CRITERIA, 'query': 'SYNTHETIC_PRIVATE'}, {**CRITERIA, 'endpoint': 'https://example.test'},
    {**CRITERIA, 'role': 'SYNTHETIC_PRIVATE'}, {**CRITERIA, 'region': 'person@example.test'},
    {**CRITERIA, 'seniority': 1}, {**CRITERIA, 'arrangement': False},
    {**CRITERIA, 'skills': ['sql', 'sql']}, {**CRITERIA, 'skills': ['https://example.test']},
    {**CRITERIA, 'skills': ['python', 'sql', 'java', 'react', 'cloud', 'testing']},
    {**CRITERIA, 'skills': 'python'}, {**CRITERIA, 'skills': [{}]},
])
def test_invalid_inputs_fail_with_fixed_error(tmp_path, payload):
    with TestClient(create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'), OfflineModel())) as client:
        response = client.post(URL, headers=HEADERS, content=json.dumps(payload))
        assert response.status_code == 422
        assert response.json() == {'error': 'invalid_search_criteria'}
        assert response.headers['cache-control'] == 'no-store'


def test_preview_requires_auth_and_cannot_read_profile_or_send_http(tmp_path, monkeypatch):
    import httpx
    def forbidden(*args, **kwargs):
        raise AssertionError('Preview accessed private storage or network')
    with TestClient(create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'), OfflineModel())) as client:
        assert client.post(URL, json=CRITERIA).status_code == 401
        monkeypatch.setattr(Database, 'load_profile', forbidden)
        monkeypatch.setattr(Database, 'save_profile', forbidden)
        monkeypatch.setattr(httpx.AsyncClient, 'request', forbidden)
        response = client.post(URL, headers=HEADERS, json=CRITERIA)
        assert response.status_code == 200
        assert response.json() == {'query': 'Software engineer jobs', 'query_version': 1, 'provider': None, 'dispatch_available': False}
        assert response.headers['cache-control'] == 'no-store'
        assert client.post('/api/v1/search', headers=HEADERS, json=CRITERIA).status_code == 422


@pytest.mark.parametrize('content', [
    b'x' * 4097, b'{', b'\xff', b'[' * 1500,
    b'{"role":"SYNTHETIC_PRIVATE","role":"software-engineer","region":"any","seniority":"any","arrangement":"any","skills":[]}',
])
def test_malformed_and_bounded_json(tmp_path, content):
    with TestClient(create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'), OfflineModel())) as client:
        response = client.post(URL, headers=HEADERS, content=content)
        assert response.status_code == 422
        assert response.json() == {'error': 'invalid_search_criteria'}
        assert client.post(URL, headers={**HEADERS, 'Content-Type': 'text/plain'}, content=json.dumps(CRITERIA)).status_code == 422


def test_every_catalog_choice_constructs_and_frontend_identifiers_match():
    source = (Path(__file__).resolve().parents[2] / 'desktop/src/lib/public-search-criteria.ts').read_text(encoding='utf-8')
    for name, field, catalog in [('roles', 'role', ROLES), ('regions', 'region', REGIONS), ('seniorities', 'seniority', SENIORITIES), ('arrangements', 'arrangement', ARRANGEMENTS), ('skills', 'skills', SKILLS)]:
        block = re.search(r'export const ' + name + r' = \{(.*?)\} as const;', source, re.S).group(1)
        keys = {quoted or bare for quoted, bare in re.findall(r"(?:'([^']+)'|([a-z]+))\s*:", block)}
        assert keys == set(catalog), name
        for key in catalog:
            query = construct_public_query({**CRITERIA, field: [key] if field == 'skills' else key})
            assert 'jobs' in query
            if catalog[key]:
                assert catalog[key] in query


def test_preview_reports_presence_without_reading_key_or_contacting_provider(tmp_path, monkeypatch):
    import httpx
    from test_providers import MemorySecrets
    from jobscout_engine.adapters.tavily import TavilyConnection
    store = MemorySecrets()
    def forbidden(*args, **kwargs):
        raise AssertionError('Preview read a secret, profile, or contacted a provider')
    monkeypatch.setattr(store, 'read', forbidden)
    monkeypatch.setattr(Database, 'load_profile', forbidden)
    monkeypatch.setattr(httpx.AsyncClient, 'request', forbidden)
    monkeypatch.setattr(TavilyConnection, 'check', forbidden)
    with TestClient(create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'),
                              OfflineModel(), secret_store=store)) as client:
        for key, expected in [(None, None), ('SYNTHETIC-ONLY', 'tavily'), (None, None)]:
            store.key = key
            response = client.post(URL, headers=HEADERS, json=CRITERIA)
            assert response.status_code == 200
            assert response.json() == {'query': 'Software engineer jobs', 'query_version': 1,
                                       'provider': expected, 'dispatch_available': expected is not None}
            assert 'SYNTHETIC' not in response.text


def test_vault_unavailable_still_allows_local_preview(tmp_path):
    from jobscout_engine.adapters.secrets import UnavailableSecretStore
    with TestClient(create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'),
                              OfflineModel(), secret_store=UnavailableSecretStore())) as client:
        response = client.post(URL, headers=HEADERS, json=CRITERIA)
        assert response.status_code == 200
        assert response.json()['provider'] is None
        assert response.json()['dispatch_available'] is False
