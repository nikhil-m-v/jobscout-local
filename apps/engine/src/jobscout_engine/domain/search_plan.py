"""Engine-owned bounded plans from reviewed public categories only."""
from jobscout_engine.domain.search import construct_public_query

MAX_CANDIDATES = 50
PLAN_SECONDS = 75
POSTING_SOURCES = (
    ('Greenhouse', ('boards.greenhouse.io', 'job-boards.greenhouse.io')),
    ('Lever', ('jobs.lever.co', 'jobs.eu.lever.co')),
    ('Ashby', ('jobs.ashbyhq.com',)),
    ('Workday', ('myworkdayjobs.com',)),
    ('SmartRecruiters', ('jobs.smartrecruiters.com', 'www.smartrecruiters.com')),
)


def construct_search_plan(criteria: object) -> dict:
    base = construct_public_query(criteria)
    # Fixed source scopes diversify the pool without altering reviewed categories.
    return {'version': 2, 'queries': [base] * len(POSTING_SOURCES),
            'sources': [{'name': name, 'domains': list(domains)} for name, domains in POSTING_SOURCES],
            'max_requests': 5, 'max_candidates': MAX_CANDIDATES,
            'estimated_max_credits': 5, 'timeout_seconds': PLAN_SECONDS}
