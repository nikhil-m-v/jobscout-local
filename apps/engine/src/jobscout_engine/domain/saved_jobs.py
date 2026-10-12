"""Bounded local snapshots, independent of private profile and discovery adapters."""
from datetime import datetime, timezone
import re
from jobscout_engine.domain.result_urls import public_result_url

MAX_SAVED_JOBS = 200
MAX_SAVED_JOB_BODY_BYTES = 120_000
MAX_JOB_NOTES = 4000
MAX_TRACKING_BODY_BYTES = 50_000


class TrackingConflict(Exception):
    pass


def validate_tracking(value: object) -> dict:
    if (type(value) is not dict or set(value) != {'stage', 'notes', 'revision', 'confirmed'}
            or value['confirmed'] is not True or value['stage'] not in ('saved', 'applied', 'interview')
            or type(value['revision']) is not int or not 0 <= value['revision'] < 2**31 - 1):
        raise ValueError()
    notes = value['notes']
    if (type(notes) is not str or len(notes) > MAX_JOB_NOTES
            or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', notes)):
        raise ValueError()
    notes.encode('utf-8')
    return {key: value[key] for key in ('stage', 'notes', 'revision')}


class SavedJobsFull(Exception):
    pass


def validate_snapshot(value: object) -> dict:
    fields = {'title', 'url', 'snippet', 'source_index', 'provider', 'retrieved_at'}
    if type(value) is not dict or set(value) != fields or value['provider'] != 'tavily':
        raise ValueError()
    for field, maximum, required in [('title', 512, True), ('snippet', 16384, False)]:
        text = value[field]
        if (type(text) is not str or len(text) > maximum or (required and not text.strip())
                or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', text)):
            raise ValueError()
        text.encode('utf-8')
    source = value['source_index']
    if source is not None and (type(source) is not int or not 0 <= source < 5):
        raise ValueError()
    date = value['retrieved_at']
    if type(date) is not str or len(date) > 40:
        raise ValueError()
    parsed = datetime.fromisoformat(date)
    if parsed.tzinfo is None or parsed.utcoffset() != timezone.utc.utcoffset(parsed):
        raise ValueError()
    return {**value, 'url': public_result_url(value['url']), 'retrieved_at': parsed.isoformat()}
