"""Bounded local category suggestions and snippet matching; no network or storage."""
import re
from jobscout_engine.domain.documents import MAX_TEXT_CHARACTERS
from jobscout_engine.domain.search import SKILLS, REGIONS

ROLE_ALIASES = {
    'software-engineer': ('software engineer', 'software developer', 'frontend developer', 'backend developer', 'full stack developer'),
    'data-analyst': ('data analyst', 'business intelligence analyst'),
    'data-engineer': ('data engineer', 'analytics engineer'),
    'product-manager': ('product manager',),
    'product-designer': ('product designer', 'ux designer', 'ui designer'),
    'quality-engineer': ('quality engineer', 'qa engineer', 'test engineer', 'software tester'),
    'it-support': ('it support', 'help desk', 'helpdesk'),
    'project-manager': ('project manager',),
}
SKILL_ALIASES = {key: (label,) for key, label in SKILLS.items()}
SKILL_ALIASES.update({
    'dotnet': ('.net', 'dotnet', 'c#'), 'cloud': ('aws', 'azure', 'google cloud', 'cloud platforms'),
    'analytics': ('data analytics', 'data analysis', 'power bi', 'tableau'),
    'design': ('product design', 'ux design', 'ui design', 'figma'),
    'testing': ('software testing', 'pytest', 'selenium', 'playwright'),
})


def mention_phrases(text: str, aliases: dict) -> dict[str, str]:
    # Whole terms avoid Java/JavaScript and SQL/NoSQL confusion. Order reflects
    # first mention, not inferred seniority, expertise, recency or desired career.
    found = []
    for key, names in aliases.items():
        hits = [(match.start(), match.group()) for name in names
                     if (match := re.search(r'(?<!\w)' + re.escape(name) + r'(?!\w)', text, re.IGNORECASE))]
        if hits:
            position, phrase = min(hits)
            found.append((position, key, phrase))
    return {key: phrase for _, key, phrase in sorted(found)}


def mentions(text: str, aliases: dict) -> list[str]:
    return list(mention_phrases(text, aliases))


def analyze_review(value: object) -> dict:
    if (type(value) is not dict or set(value) != {'text', 'reviewed', 'candidates'}
            or value['reviewed'] is not True or type(value['text']) is not str
            or len(value['text']) > MAX_TEXT_CHARACTERS or '\x00' in value['text']
            or type(value['candidates']) is not list or len(value['candidates']) > 10):
        raise ValueError()
    value['text'].encode('utf-8')
    text = value['text']
    roles = mentions(text, ROLE_ALIASES)
    skills = mentions(text, SKILL_ALIASES)
    resume_phrases = mention_phrases(text, SKILL_ALIASES)
    matches = []
    for index, candidate in enumerate(value['candidates']):
        if (type(candidate) is not dict or set(candidate) != {'title', 'snippet'}
                or type(candidate['title']) is not str or len(candidate['title']) > 512
                or type(candidate['snippet']) is not str or len(candidate['snippet']) > 16384):
            raise ValueError()
        content = candidate['title'] + '\n' + candidate['snippet']
        job_skills = mentions(content, SKILL_ALIASES)
        title_phrases = mention_phrases(candidate['title'], SKILL_ALIASES)
        snippet_phrases = mention_phrases(candidate['snippet'], SKILL_ALIASES)
        shared = [skill for skill in job_skills if skill in skills]
        matches.append({'index': index, 'skills': job_skills,
                        'shared_skills': shared,
                        'shared_evidence': [{'skill': skill, 'resume_phrase': resume_phrases[skill],
                                             'job_phrase': title_phrases.get(skill, snippet_phrases.get(skill)),
                                             'job_source': 'title' if skill in title_phrases else 'snippet'} for skill in shared],
                        'roles': mentions(content, ROLE_ALIASES),
                        'regions': mentions(content, {key: (name,) for key, name in REGIONS.items() if name}),
                        'arrangements': mentions(content, {'remote': ('remote',), 'hybrid': ('hybrid',), 'onsite': ('on-site', 'onsite')}),
                        'seniorities': mentions(content, {'internship': ('internship', 'intern'), 'entry': ('entry level', 'entry-level', 'junior'), 'mid': ('mid level', 'mid-level'), 'senior': ('senior',), 'lead': ('lead',)})})
    criteria = {'role': roles[0], 'skills': skills[:5], 'region': 'any', 'arrangement': 'any', 'seniority': 'any'} if roles else None
    return {'criteria': criteria, 'roles': roles, 'skills': skills, 'matches': matches}
