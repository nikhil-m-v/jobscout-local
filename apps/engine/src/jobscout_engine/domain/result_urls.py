"""Conservative, offline result-link normalization; never resolves destinations."""
import ipaddress
import re
from urllib.parse import unquote_plus, urlsplit, urlunsplit

TRACKING_KEYS = frozenset({'gclid', 'dclid', 'fbclid', 'msclkid', 'mc_cid', 'mc_eid'})


def public_result_url(value: object) -> str:
    if type(value) is not str or not 1 <= len(value) <= 2048 or re.search(r"[\s\x00-\x1f\x7f\\]", value):
        raise ValueError()
    parts = urlsplit(value)
    host = parts.hostname
    if (parts.scheme != 'https' or not host or parts.username is not None
            or parts.password is not None or parts.port not in (None, 443)):
        raise ValueError()
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        labels = host.split('.')
        if (len(labels) < 2 or len(host) > 253 or not re.fullmatch(r'[a-zA-Z]{2,63}', labels[-1])
                or host.lower().endswith(('.localhost', '.local', '.internal', '.test', '.invalid'))
                or any(not re.fullmatch(r'[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?', label) for label in labels)):
            raise ValueError()
    else:
        if not address.is_global or address.is_multicast or address.is_reserved:
            raise ValueError()
    # Preserve job IDs, unknown parameters, order, escaping, path case and slashes.
    # Only known tracking keys are removed; broad keys such as "ref" may identify jobs.
    parameters = []
    for parameter in parts.query.split('&'):
        key = unquote_plus(parameter.split('=', 1)[0]).casefold()
        if not key.startswith('utm_') and key not in TRACKING_KEYS:
            parameters.append(parameter)
    netloc = f'[{host}]' if ':' in host else host
    canonical = urlunsplit(('https', netloc, parts.path or '/', '&'.join(parameters), ''))
    if len(canonical) > 2048:
        raise ValueError()
    return canonical
