"""Synthetic link identity cases; no DNS, website access or personal inputs."""
import pytest
from jobscout_engine.domain.result_urls import public_result_url


@pytest.mark.parametrize('raw,expected', [
    ('https://JOBS.example.com:443/Role?job=42&utm_source=board#apply', 'https://jobs.example.com/Role?job=42'),
    ('https://jobs.example.com?gclid=abc', 'https://jobs.example.com/'),
    ('https://jobs.example.com/role?%75tm_medium=email&FBCLID=abc&id=7', 'https://jobs.example.com/role?id=7'),
    ('https://jobs.example.com/role?id=7&ref=board&source=agency&campaign=42', 'https://jobs.example.com/role?id=7&ref=board&source=agency&campaign=42'),
    ('https://jobs.example.com/role?q=a%2Bb&job=7&job=8&flag', 'https://jobs.example.com/role?q=a%2Bb&job=7&job=8&flag'),
    ('https://jobs.example.com/Role/', 'https://jobs.example.com/Role/'),
    ('https://jobs.example.com/role?mc_cid=x&mc_eid=y&dclid=z&msclkid=w', 'https://jobs.example.com/role'),
])
def test_conservative_canonical_links(raw, expected):
    assert public_result_url(raw) == expected
    assert public_result_url(expected) == expected


@pytest.mark.parametrize('raw', [
    'https://localhost/role', 'https://jobs.local/role', 'https://127.0.0.1/role',
    'https://user:password@jobs.example.com/role', 'https://jobs.example.com:444/role',
    'http://jobs.example.com/role', 'https://jobs.example.com/role\\other',
    'https://jobs.example.com/role\n', 'javascript:alert(1)',
])
def test_canonicalization_preserves_public_url_boundary(raw):
    with pytest.raises(ValueError):
        public_result_url(raw)


def test_root_slash_cannot_expand_link_past_contract_bound():
    prefix = 'https://jobs.example.com?job='
    with pytest.raises(ValueError):
        public_result_url(prefix + 'a' * (2048 - len(prefix)))
