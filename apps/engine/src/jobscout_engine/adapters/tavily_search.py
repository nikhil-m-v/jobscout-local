"""Bounded search boundary. No profile, database, vault, SDK or model access."""
import asyncio
import ipaddress
import json
import re
from urllib.parse import urlsplit, urlunsplit
import httpx
from jobscout_engine.domain.discovery import DiscoveryFailure, DiscoveryResult, SearchCandidate
from jobscout_engine.domain.providers import validate_tavily_key
from jobscout_engine.domain.search import construct_public_query, reject_duplicate_keys

SEARCH_ENDPOINT = "https://api.tavily.com/search"
MAX_RESULTS = 10
MAX_RESPONSE_BYTES = 262_144
SEARCH_TIMEOUT_SECONDS = 20


def public_result_url(value: object) -> str:
    if type(value) is not str or not 1 <= len(value) <= 2048 or re.search(r"[\s\x00-\x1f\x7f\\]", value):
        raise ValueError()
    parts = urlsplit(value)
    host = parts.hostname
    if (parts.scheme != "https" or not host or parts.username is not None
            or parts.password is not None or parts.port not in (None, 443)):
        raise ValueError()
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        # Restrict to conventional public DNS names; no single-label/local/numeric aliases.
        labels = host.split('.')
        if (len(labels) < 2 or len(host) > 253 or not re.fullmatch(r"[a-zA-Z]{2,63}", labels[-1])
                or host.lower().endswith(('.localhost', '.local', '.internal', '.test', '.invalid'))
                or any(not re.fullmatch(r"[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?", label) for label in labels)):
            raise ValueError()
    else:
        if not address.is_global or address.is_multicast or address.is_reserved:
            raise ValueError()
    # Remove fragments; never fetch, resolve, open, or inspect the destination here.
    return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ''))


def parse_candidates(data: object) -> tuple[SearchCandidate, ...]:
    if type(data) is not dict or type(data.get('results')) is not list or len(data['results']) > MAX_RESULTS:
        raise ValueError()
    candidates = []
    seen = set()
    for item in data['results']:
        if type(item) is not dict:
            raise ValueError()
        title, content = item.get('title'), item.get('content')
        if (type(title) is not str or not title.strip() or len(title) > 512
                or type(content) is not str or len(content) > 16_384
                or any(ord(char) < 32 and char not in '\n\r\t' for char in title + content)
                or '\x7f' in title + content):
            raise ValueError()
        url = public_result_url(item.get('url'))
        if url not in seen:
            candidates.append(SearchCandidate(title.strip(), url, content.strip()))
            seen.add(url)
    return tuple(candidates)


class TavilySearch:
    def __init__(self, *, transport: httpx.AsyncBaseTransport | None = None):
        self._transport = transport

    async def search(self, criteria: object, *, key: str, reviewed_query: str) -> DiscoveryResult:
        # Rebuild from controlled raw criteria immediately before dispatch. Never send
        # the caller's preview text, arbitrary options or an endpoint from the caller.
        try:
            query = construct_public_query(criteria)
        except ValueError:
            raise DiscoveryFailure('invalid_search_criteria') from None
        if type(reviewed_query) is not str or reviewed_query != query:
            raise DiscoveryFailure('search_review_required')
        try:
            validate_tavily_key({'key': key})
        except ValueError:
            raise DiscoveryFailure('invalid_provider_key') from None
        try:
            return await asyncio.wait_for(self._search(key, query), timeout=SEARCH_TIMEOUT_SECONDS)
        except (asyncio.TimeoutError, httpx.TimeoutException):
            raise DiscoveryFailure('provider_timeout') from None
        except httpx.RequestError:
            raise DiscoveryFailure('provider_unavailable') from None

    async def _search(self, key: str, query: str) -> DiscoveryResult:
        body = {'query': query, 'search_depth': 'basic', 'topic': 'general',
                'max_results': MAX_RESULTS, 'auto_parameters': False,
                'include_answer': False, 'include_raw_content': False,
                'include_images': False, 'include_favicon': False}
        async with httpx.AsyncClient(
            transport=self._transport, trust_env=False, follow_redirects=False,
            verify=True, timeout=httpx.Timeout(10),
            limits=httpx.Limits(max_connections=1, max_keepalive_connections=0),
            headers={'Authorization': f'Bearer {key}', 'Accept': 'application/json',
                     'Accept-Encoding': 'identity', 'User-Agent': 'JobScout/0.1'},
        ) as client:
            async with client.stream('POST', SEARCH_ENDPOINT, json=body) as response:
                code = {401: 'provider_invalid_key', 403: 'provider_invalid_key',
                        429: 'provider_rate_limited', 432: 'provider_quota_exhausted',
                        433: 'provider_quota_exhausted'}.get(response.status_code)
                if code:
                    raise DiscoveryFailure(code)
                if response.status_code != 200:
                    raise DiscoveryFailure('provider_unavailable')
                if (response.headers.get('content-type', '').split(';')[0].strip().lower() != 'application/json'
                        or response.headers.get('content-encoding', 'identity').lower() != 'identity'):
                    raise DiscoveryFailure('provider_invalid_response')
                length = response.headers.get('content-length')
                if length is not None and (not length.isdecimal() or len(length) > 6 or int(length) > MAX_RESPONSE_BYTES):
                    raise DiscoveryFailure('provider_invalid_response')
                raw = bytearray()
                async for chunk in response.aiter_raw():
                    if len(raw) + len(chunk) > MAX_RESPONSE_BYTES:
                        raise DiscoveryFailure('provider_invalid_response')
                    raw.extend(chunk)
                try:
                    data = json.loads(raw, object_pairs_hook=reject_duplicate_keys)
                    candidates = parse_candidates(data)
                    # Reject credential echoes in selected fields instead of displaying secrets.
                    if any(key in field for item in candidates for field in (item.title, item.url, item.snippet)):
                        raise ValueError()
                except (ValueError, UnicodeError, RecursionError):
                    raise DiscoveryFailure('provider_invalid_response') from None
                # Drop provider answers, scores, images, raw HTML, metadata and echoed query.
                return DiscoveryResult(query, 'tavily', candidates)
