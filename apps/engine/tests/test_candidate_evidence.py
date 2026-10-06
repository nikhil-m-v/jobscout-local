import pytest
from jobscout_engine.domain.assistance import analyze_review
from jobscout_engine.domain.candidate_content import classify_content


def evidence(title, snippet, review='Software engineer AWS Python SQL'):
    return analyze_review({'text': review, 'reviewed': True, 'candidates': [{'title': title, 'snippet': snippet}]})['matches'][0]['shortlist']


def test_exact_tools_find_later_matching_alias_without_equating_cloud_vendors():
    assert evidence('Software engineer', 'Azure')['exact_tools'] == []
    tools = evidence('Azure engineer', 'Uses AWS PYTHON')['exact_tools']
    assert {item['skill']: (item['resume_phrase'], item['job_phrase']) for item in tools} == {'cloud': ('AWS', 'AWS'), 'python': ('Python', 'PYTHON')}
    assert all(item['job_source'] == 'snippet' for item in tools)


def test_title_and_snippet_roles_remain_distinct_and_literal():
    roles = evidence('Data analyst', 'Works with software engineers and a Software engineer')['roles']
    assert {'role': 'data-analyst', 'source': 'title', 'phrase': 'Data analyst'} in roles
    assert {'role': 'software-engineer', 'source': 'snippet', 'phrase': 'Software engineer'} in roles


@pytest.mark.parametrize('snippet,excluded', [('No Python positions', True), ('We do not use Python', True), ("We don't use Python", True), ('No Python experience required', False), ('Python not required', False), ('Not only Python', False), ('Without Python experience you may apply', False)])
def test_only_narrow_explicit_exclusions_remove_positive_tool_evidence(snippet, excluded):
    data = evidence('Software engineer', snippet)
    assert bool(data['exclusions']) == excluded
    assert bool(data['exact_tools']) != excluded
    for item in data['exclusions']:
        assert item['phrase'] in snippet


def test_positive_occurrence_survives_a_competing_explicit_exclusion():
    data = evidence('Python Software engineer', 'No Python positions in another team')
    assert data['exact_tools'][0]['job_source'] == 'title'
    assert len(data['exclusions']) == 1


@pytest.mark.parametrize('title', ['5,000+ Python Developer jobs in India', 'Remote Software Engineer Jobs in India', 'Python Job Board', 'Remote Python jobs | Careers', '300 Python Job Vacancies in India'])
def test_collection_titles_are_distinct_even_with_opening_language(title):
    result = classify_content(title, 'Hiring now. Apply now.')
    assert result['status'] == 'collection'
    assert any(item['kind'] == 'collection' and item['source'] == 'title' and item['phrase'] in title for item in result['evidence'])


@pytest.mark.parametrize('title,snippet', [('Software engineer', 'We list 100 jobs in India'), ('Software engineer - Job Board team', 'Hiring'), ('Software engineer, 3 years experience', 'Hiring now')])
def test_collection_language_in_snippets_does_not_hide_individual_openings(title, snippet):
    assert classify_content(title, snippet)['status'] != 'collection'
