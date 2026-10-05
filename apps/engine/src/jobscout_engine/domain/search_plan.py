"""Engine-owned bounded plans from reviewed public categories only."""
from jobscout_engine.domain.search import construct_public_query

MAX_CANDIDATES = 50
PLAN_SECONDS = 75
SEARCH_TERMS = ('jobs', 'job openings', 'vacancies', 'hiring', 'careers')


def construct_search_plan(criteria: object) -> dict:
    base = construct_public_query(criteria)
    # Only replace the fixed catalog query's first search intent token.
    prefix, remainder = base.split(' jobs', 1)
    return {'version': 1, 'queries': [prefix + ' ' + term + remainder for term in SEARCH_TERMS],
            'max_requests': 5, 'max_candidates': MAX_CANDIDATES,
            'estimated_max_credits': 5, 'timeout_seconds': PLAN_SECONDS}
