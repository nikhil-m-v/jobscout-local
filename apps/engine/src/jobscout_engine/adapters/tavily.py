"""Fixed account check. No search, profile, arbitrary URL or provider SDK access."""
import asyncio
import json
import httpx
from jobscout_engine.domain.providers import validate_tavily_key
from jobscout_engine.domain.search import reject_duplicate_keys

USAGE_ENDPOINT = "https://api.tavily.com/usage"
MAX_RESPONSE_BYTES = 16_384
CHECK_TIMEOUT_SECONDS = 10


class ProviderCheckFailure(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


class TavilyConnection:
    def __init__(self, *, transport: httpx.AsyncBaseTransport | None = None):
        # Injection is for captured synthetic tests; endpoint/options are fixed.
        self._transport = transport

    async def check(self, key: str) -> None:
        try:
            validate_tavily_key({"key": key})
        except ValueError:
            raise ProviderCheckFailure("invalid_provider_key") from None
        try:
            await asyncio.wait_for(self._check_usage(key), timeout=CHECK_TIMEOUT_SECONDS)
        except (asyncio.TimeoutError, httpx.TimeoutException):
            raise ProviderCheckFailure("provider_timeout") from None
        except httpx.RequestError:
            raise ProviderCheckFailure("provider_unavailable") from None

    async def _check_usage(self, key: str) -> None:
        async with httpx.AsyncClient(
            transport=self._transport, trust_env=False, follow_redirects=False,
            verify=True, timeout=httpx.Timeout(5),
            limits=httpx.Limits(max_connections=1, max_keepalive_connections=0),
            headers={"Authorization": f"Bearer {key}", "Accept": "application/json",
                     "Accept-Encoding": "identity", "User-Agent": "JobScout/0.1"},
        ) as client:
            async with client.stream("GET", USAGE_ENDPOINT) as response:
                if response.status_code in (401, 403):
                    raise ProviderCheckFailure("provider_invalid_key")
                if response.status_code == 429:
                    raise ProviderCheckFailure("provider_rate_limited")
                if response.status_code in (432, 433):
                    raise ProviderCheckFailure("provider_quota_exhausted")
                # Do not follow redirects, retry, inspect errors or disclose bodies.
                if response.status_code != 200:
                    raise ProviderCheckFailure("provider_unavailable")
                if (response.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json"
                        or response.headers.get("content-encoding", "identity").lower() != "identity"):
                    raise ProviderCheckFailure("provider_invalid_response")
                length = response.headers.get("content-length")
                if length is not None and (not length.isdecimal() or len(length) > 6 or int(length) > MAX_RESPONSE_BYTES):
                    raise ProviderCheckFailure("provider_invalid_response")
                body = bytearray()
                async for chunk in response.aiter_raw():
                    if len(body) + len(chunk) > MAX_RESPONSE_BYTES:
                        raise ProviderCheckFailure("provider_invalid_response")
                    body.extend(chunk)
                try:
                    data = json.loads(body, object_pairs_hook=reject_duplicate_keys)
                    # Consume only the minimal documented shape; no account data escapes.
                    if not isinstance(data, dict) or not isinstance(data.get("account"), dict):
                        raise ValueError()
                    usage = data.get("key")
                    if (not isinstance(usage, dict) or type(usage.get('usage')) is not int
                            or not 0 <= usage['usage'] <= 1_000_000_000 or 'limit' not in usage
                            or (usage['limit'] is not None and
                                (type(usage['limit']) is not int or not 0 <= usage['limit'] <= 1_000_000_000))):
                        raise ValueError()
                except (ValueError, UnicodeError, RecursionError):
                    raise ProviderCheckFailure("provider_invalid_response") from None
                # Usage is evidence of accepted authentication, not guaranteed search quota.
                # Pay-as-you-go and account limits mean key usage alone is insufficient.
