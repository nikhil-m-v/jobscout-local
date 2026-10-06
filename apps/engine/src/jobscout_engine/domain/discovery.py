"""Small replaceable discovery contract; provider text is data, never instructions."""
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class SearchCandidate:
    title: str
    url: str
    snippet: str
    source_index: int | None = None


@dataclass(frozen=True)
class DiscoveryResult:
    query: str
    provider: str
    candidates: tuple[SearchCandidate, ...]
    retrieved_at: str
    duplicates_removed: int
    discarded_results: int = 0


class DiscoveryFailure(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


class SearchProvider(Protocol):
    async def search(self, criteria: object, *, key: str,
                     reviewed_query: str) -> DiscoveryResult: ...

    async def search_variant(self, criteria: object, *, key: str,
                             reviewed_query: str, variant: int) -> DiscoveryResult: ...
