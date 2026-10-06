"""Conservative literal shortlist evidence; no network, storage or inferred fit."""
import re


def hits(text, phrase):
    return list(re.finditer(r'(?<!\w)' + re.escape(phrase) + r'(?!\w)', text, re.IGNORECASE))


def exclusion(text, match):
    # Deliberately narrow. "No Python experience required" is not an exclusion.
    before = text[max(0, match.start() - 24):match.start()]
    after = text[match.end():match.end() + 24]
    if re.search(r'\bno +$', before, re.I) and re.match(r' +(?:positions|roles|jobs|openings)\b', after, re.I):
        start = match.start() - len(re.search(r'\bno +$', before, re.I).group())
        end = match.end() + re.match(r' +(?:positions|roles|jobs|openings)\b', after, re.I).end()
        return text[start:end]
    absent = re.search(r'\b(?:do not|don\x27t|never) +use +$', before, re.I)
    if absent:
        return text[match.start() - len(absent.group()):match.end()]
    return None


def resume_tool_phrases(review, skill_aliases):
    return {alias: next((hit.group() for hit in hits(review, alias) if not exclusion(review, hit)), None) for aliases in skill_aliases.values() for alias in aliases}


def shortlist_evidence(review, title, snippet, role_aliases, skill_aliases, resume_tools=None):
    resume_tools = resume_tools if resume_tools is not None else resume_tool_phrases(review, skill_aliases)
    role_evidence = []
    for role, aliases in role_aliases.items():
        for source, text in (('title', title), ('snippet', snippet)):
            found = sorted((hit for alias in aliases for hit in hits(text, alias)), key=lambda hit: hit.start())
            if found:
                role_evidence.append({'role': role, 'source': source, 'phrase': found[0].group()})
    exact_tools, exclusions = [], []
    for skill, aliases in skill_aliases.items():
        overlap = []
        for alias in aliases:
            resume_phrase = resume_tools[alias]
            for source, text in (('title', title), ('snippet', snippet)):
                for hit in hits(text, alias):
                    negative = exclusion(text, hit)
                    if negative:
                        signal = {'skill': skill, 'source': source, 'phrase': negative}
                        if signal not in exclusions:
                            exclusions.append(signal)
                    elif resume_phrase:
                        overlap.append((source != 'title', hit.start(), {'skill': skill, 'resume_phrase': resume_phrase, 'job_phrase': hit.group(), 'job_source': source}))
        if overlap:
            exact_tools.append(min(overlap, key=lambda item: item[:2])[2])
    return {'roles': role_evidence, 'exact_tools': exact_tools, 'exclusions': exclusions[:24]}
