"""Small replaceable discovery contract; provider text is data, never instructions."""
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class SearchCandidate:
    title: str
    url: str
    snippet: str


@dataclass(frozen=True)
class DiscoveryResult:
    query: str
    provider: str
    candidates: tuple[SearchCandidate, ...]


class DiscoveryFailure(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


class SearchProvider(Protocol):
    async def search(self, criteria: object, *, key: str,
                     reviewed_query: str) -> DiscoveryResult: ...
