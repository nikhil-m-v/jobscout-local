"""Finite synthetic installed-search harness regressions; no sockets or vault."""
import asyncio
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4

import httpx

spec = importlib.util.spec_from_file_location('installed_search', Path(__file__).parents[1] / 'installed_search_engine.py')
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)


class InstalledSearchTests(unittest.TestCase):
    def test_only_exact_identity_without_relocation_is_accepted(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'APPDATA': directory}):
            path = Path(directory) / engine.IDENTITY
            self.assertEqual(engine.validate_data_directory(path), path)
            for invalid in (Path(directory) / 'production', Path(directory) / 'other' / engine.IDENTITY,
                            Path('relative') / engine.IDENTITY):
                with self.assertRaises(ValueError):
                    engine.validate_data_directory(invalid)
            path.mkdir()
            (path / 'workspace-location.json').write_text('{}')
            with self.assertRaises(ValueError):
                engine.validate_data_directory(path)

    def test_reparse_point_is_rejected_before_resolution(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'APPDATA': directory}):
            path = Path(directory) / engine.IDENTITY
            path.mkdir()
            original = Path.lstat
            def lstat(member, *args, **kwargs):
                info = original(member, *args, **kwargs)
                if member == path:
                    from types import SimpleNamespace
                    return SimpleNamespace(st_mode=info.st_mode, st_file_attributes=0x400)
                return info
            with patch.object(Path, 'lstat', lstat), self.assertRaises(ValueError):
                engine.validate_data_directory(path)

    def test_same_identity_appdata_projection_is_allowed_without_relaxing_lexical_guard(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'APPDATA': directory}):
            path = Path(directory) / engine.IDENTITY
            path.mkdir()
            projected = Path(directory) / 'package' / 'LocalCache' / 'Roaming' / engine.IDENTITY
            original = Path.resolve
            def resolve(member, *args, **kwargs):
                if member == path:
                    return projected
                return original(member, *args, **kwargs)
            with patch.object(Path, 'resolve', resolve):
                self.assertEqual(engine.validate_data_directory(path), path)
                # Sharing a basename or even a resolved target never grants access
                # to a different lexical storage directory.
                with self.assertRaises(ValueError):
                    engine.validate_data_directory(projected)

    def test_production_initial_routing_validates_and_reopens_without_relocation(self):
        async def scenario():
            with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'APPDATA': directory}):
                path = Path(directory) / engine.IDENTITY
                app, _ = engine.create_installed_search_app(path, 'synthetic-token')
                async with app.router.lifespan_context(app):
                    self.assertEqual(json.loads((path / engine.CONFIG).read_text()),
                                     {'version': 1, 'active': str(path), 'retained': []})
                    self.assertTrue((path / engine.REQUIRED).is_file())
                self.assertEqual(engine.validate_data_directory(path), path)
                reopened, later = engine.create_installed_search_app(path, 'new-synthetic-token')
                async with reopened.router.lifespan_context(reopened):
                    self.assertEqual(later.facts['attempted'], 0)
                    self.assertEqual(engine.validate_data_directory(path), path)
                relocated = Path(directory) / 'outside-the-identity'
                relocated.mkdir()
                (path / engine.CONFIG).write_text(json.dumps({'version': 1, 'active': str(relocated),
                                                             'retained': [str(path)]}))
                with self.assertRaises(ValueError):
                    engine.validate_data_directory(path)
        asyncio.run(scenario())

    def test_routing_metadata_is_bounded_unambiguous_plain_and_never_owned_copy(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'APPDATA': directory}):
            path = Path(directory) / engine.IDENTITY
            path.mkdir()
            marker, config = path / engine.REQUIRED, path / engine.CONFIG
            marker.write_text('Routing configuration required. Do not remove.\n')
            with self.assertRaises(ValueError):
                engine.validate_data_directory(path)
            invalid = ['x' * (engine.MAX_CONFIG + 1),
                       '{"version":1,"version":1,"active":' + json.dumps(str(path)) + ',"retained":[]}',
                       json.dumps({'version': True, 'active': str(path), 'retained': []}),
                       json.dumps({'version': 1, 'active': str(path), 'retained': [], 'extra': False})]
            for payload in invalid:
                config.write_text(payload)
                with self.assertRaises(ValueError):
                    engine.validate_data_directory(path)
            config.write_text(json.dumps({'version': 1, 'active': str(path), 'retained': []}))
            self.assertEqual(engine.validate_data_directory(path), path)
            # A hard-linked routing file is not independently owned test metadata.
            link = path / 'routing-hardlink'
            os.link(config, link)
            with self.assertRaises(ValueError):
                engine.validate_data_directory(path)
            link.unlink()
            (path / engine.OWNER).write_text('not a permitted copied workspace')
            with self.assertRaises(ValueError):
                engine.validate_data_directory(path)

    def test_destination_body_and_authentication_drift_fail_closed(self):
        async def scenario():
            with tempfile.TemporaryDirectory() as directory:
                journal = engine.Journal(Path(directory))
                transport = engine.ClosureTransport(journal)
                payload = engine.expected_payload(0)
                requests = [
                    httpx.Request('POST', 'https://other.example/search', json=payload),
                    httpx.Request('GET', engine.SEARCH_ENDPOINT, json=payload),
                    httpx.Request('POST', engine.SEARCH_ENDPOINT, json={**payload, 'profile': 'SYNTHETIC PRIVATE MARKER'}),
                    httpx.Request('POST', engine.SEARCH_ENDPOINT, content=b'{broken'),
                ]
                for request in requests:
                    request.headers['authorization'] = f'Bearer {engine.KEY}'
                    with self.assertRaises(AssertionError):
                        await transport.search(request)
                with self.assertRaises(AssertionError):
                    await transport.search(httpx.Request('POST', engine.SEARCH_ENDPOINT, json=payload))
                self.assertEqual(journal.facts['attempted'], 0)
                self.assertEqual(journal.facts['violations'], 5)
                self.assertNotIn('SYNTHETIC PRIVATE MARKER', journal.path.read_text())
                self.assertNotIn(engine.KEY, journal.path.read_text())
        asyncio.run(scenario())

    def test_real_search_shutdown_cancels_second_and_skips_remaining(self):
        async def scenario():
            with tempfile.TemporaryDirectory() as directory:
                with patch('jobscout_engine.app.create_secret_store', side_effect=AssertionError('vault used')), \
                        patch('jobscout_engine.app.OllamaProvider', side_effect=AssertionError('model used')), \
                        patch.object(httpx.AsyncHTTPTransport, 'handle_async_request', side_effect=AssertionError('network used')):
                    app, journal = engine.create_installed_search_app(Path(directory), 'synthetic-token')
                    plan = engine.construct_search_plan(engine.CRITERIA)
                    body = {'criteria': engine.CRITERIA, 'provider': 'tavily', 'query_version': 1,
                            'reviewed_query': plan['queries'][0], 'reviewed_plan': plan,
                            'confirmed': True, 'run_id': str(uuid4())}
                    async with app.router.lifespan_context(app):
                        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://local',
                                  headers={'Authorization': 'Bearer synthetic-token'}) as client:
                            health = await client.get('/api/v1/health')
                            self.assertEqual(health.json()['local_ai']['status'], 'unavailable')
                            pending = asyncio.create_task(client.post('/api/v1/search', json=body))
                            try:
                                async with asyncio.timeout(3):
                                    while journal.facts['attempted'] != 2:
                                        await asyncio.sleep(.01)
                                self.assertEqual(journal.facts['completed'], 1)
                                self.assertEqual(journal.facts['active'], 1)
                                app.state.begin_shutdown()
                                result = await asyncio.wait_for(pending, 2)
                                self.assertEqual(result.status_code, 200)
                                self.assertEqual(len(result.json()['candidates']), 1)
                                self.assertEqual(result.json()['coverage'], {'attempted': 2, 'completed': 1,
                                    'max_requests': 5, 'stop_reason': 'cancelled', 'failures': []})
                            finally:
                                if not pending.done():
                                    pending.cancel()
                                await asyncio.gather(pending, return_exceptions=True)
                    facts = json.loads(journal.path.read_text())
                    self.assertEqual((facts['attempted'], facts['completed'], facts['cancelled'],
                                      facts['active'], facts['violations']), (2, 1, 1, 0, 0))
                    self.assertTrue(facts['shutdown_started'])
                    # A fresh launch cannot inherit a search or automatically dispatch.
                    restarted, later = engine.create_installed_search_app(Path(directory), 'new-synthetic-token')
                    async with restarted.router.lifespan_context(restarted):
                        self.assertEqual(later.facts['attempted'], 0)
                    self.assertNotEqual(later.path, journal.path)
        asyncio.run(scenario())

    def test_synthetic_store_cannot_accept_actual_key_and_connection_is_forbidden(self):
        store = engine.SyntheticSecrets()
        with self.assertRaises(engine.SecretStoreUnavailable):
            store.save('tvly-pretend-real-key')
        self.assertEqual(store.read(), engine.KEY)
        async def scenario():
            with tempfile.TemporaryDirectory() as directory:
                journal = engine.Journal(Path(directory))
                with self.assertRaises(AssertionError):
                    await engine.ClosureTransport(journal).connection(httpx.Request('POST', engine.SEARCH_ENDPOINT))
                self.assertEqual(journal.facts['violations'], 1)
        asyncio.run(scenario())


if __name__ == '__main__':
    unittest.main()
