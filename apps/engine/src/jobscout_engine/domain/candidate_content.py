"""Conservative title/snippet signals, not verification of a live vacancy."""
import re

RESOURCE = re.compile(r'(?<!\w)(?:interview guide|guide|courses?|tutorials?|directory|career resources|study notes|bootcamp|training$)(?!\w)', re.I)
OPENING = re.compile(r'(?<!\w)(?:hiring|opening|vacancy|apply now|job description|open [^\n.!?]{0,60}position)(?!\w)', re.I)
COLLECTION = re.compile(r'(?<!\w)(?:[0-9][0-9,+ ]{0,12}\+? +[^\n.!?]{0,60}\b(?:jobs|job vacancies|openings)\b|job board(?= *\||$)|jobs in\b|remote [^\n.!?]{0,60}\bjobs\b|jobs *\|)(?!\w)', re.I)


def classify_content(title: str, snippet: str) -> dict:
    signals = []
    for source, text in [('title', title), ('snippet', snippet)]:
        for kind, pattern in [('resource', RESOURCE), ('opening', OPENING)]:
            match = pattern.search(text)
            if match:
                signals.append({'kind': kind, 'source': source, 'phrase': match.group()})
    collection = COLLECTION.search(title)
    if collection:
        signals.append({'kind': 'collection', 'source': 'title', 'phrase': collection.group()})
    kinds = {signal['kind'] for signal in signals}
    # Only explicit resource titles without competing opening evidence are hidden.
    # Mentions in snippets alone may describe training benefits or responsibilities.
    resource_title = any(s['kind'] == 'resource' and s['source'] == 'title' for s in signals)
    status = ('collection' if collection else 'resource' if resource_title and 'opening' not in kinds else
              'opening' if kinds == {'opening'} else 'unknown')
    return {'status': status, 'evidence': signals}
