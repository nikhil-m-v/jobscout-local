"""Print engine-owned public plans only. No dispatch, secrets or profile access."""
import json
from pathlib import Path
import sys

from jobscout_engine.domain.search_plan import construct_search_plan

if sys.argv[1:] != ['--verify-only']:
    raise SystemExit('Only --verify-only is supported; no requests or vault access.')
try:
    fixture = json.loads((Path(__file__).resolve().parents[1] / 'evaluation/search-quality-cases.json').read_text(encoding='utf-8'))
    if set(fixture) != {'version', 'cases', 'proposed_comparison'} or fixture['version'] != 1 or len(fixture['cases']) != 4:
        raise ValueError()
    ids = [case['id'] for case in fixture['cases']]
    if len(set(ids)) != len(ids) or fixture['proposed_comparison'] != ['software-india-remote-tools', 'software-india-remote']:
        raise ValueError()
    cases = []
    for case in fixture['cases']:
        if set(case) != {'id', 'criteria', 'expected_query', 'synthetic_reference'}:
            raise ValueError()
        plan = construct_search_plan(case['criteria'])
        if plan['queries'] != [case['expected_query']] * 5:
            raise ValueError()
        cases.append({'id': case['id'], 'query': case['expected_query'], 'plan': plan})
    print(json.dumps({'status': 'engine_plans_verified', 'requests': 0, 'vault_access': False,
                      'cases': cases, 'proposed_comparison': fixture['proposed_comparison'],
                      'comparison_request_ceiling': 10, 'comparison_raw_candidate_ceiling': 100,
                      'comparison_estimated_credit_ceiling': 10, 'comparison_search_seconds_ceiling': 150}))
except Exception:
    raise SystemExit('Quality case verification failed; no requests or vault access.') from None
