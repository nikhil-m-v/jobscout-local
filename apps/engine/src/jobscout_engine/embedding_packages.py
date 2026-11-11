"""Reviewed *descriptor* pins, not acquired weights or an acquisition allowlist.

Sources and exact small evidence bytes: docs/model-evidence/2026-11-11.
The full manifest identity binds the ordered layers, config and package params.
It does not establish an embedding recipe, runtime capability or legal clearance.
"""
from dataclasses import dataclass

from jobscout_engine.embedding_preflight import ArtifactPin


@dataclass(frozen=True)
class PackageEvidence:
    model_id: str
    variant: str
    files: tuple[tuple[str, ArtifactPin], ...]
    upstream_revision: str


_LICENSE = ArtifactPin('c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4', 11357)
PACKAGES = (
    PackageEvidence('minilm-l6-v2', 'all-minilm:l6-v2', (
        ('manifest', ArtifactPin('1b226e2802dbb772b5fc32a58f103ca1804ef7501331012de126ab22f67475ef', 707)),
        ('config', ArtifactPin('548455b7265836afeea130cfc8919fa3311af2a55b9fec3cbd04e811bb600ee8', 407)),
        ('model', ArtifactPin('797b70c4edf85907fe0a49eb85811256f65fa0f7bf52166b147fd16be2be4662', 45949216)),
        ('license', _LICENSE),
        ('params', ArtifactPin('85011998c600549934d2b696d7f0cb5078192b56f6c954f6987bf9228870017e', 16)),
    ), '1110a243fdf4706b3f48f1d95db1a4f5529b4d41'),
    PackageEvidence('nomic-embed-v1-5', 'nomic-embed-text:v1.5', (
        ('manifest', ArtifactPin('0a109f422b47e3a30ba2b10eca18548e944e8a23073ee3f3e947efcf3c45e59f', 708)),
        ('config', ArtifactPin('31df23ea7daa448f9ccdbbcecce6c14689c8552222b80defd3830707c0139d4f', 420)),
        ('model', ArtifactPin('970aa74c0a90ef7482477cf803618e776e173c007bf957f635f1015bfcfef0e6', 274290656)),
        ('license', _LICENSE),
        ('params', ArtifactPin('ce4a164fc04605703b485251fe9f1a181688ba0eb6badb80cc6335c0de17ca0d', 17)),
    ), 'e9b6763023c676ca8431644204f50c2b100d9aab'),
)


def package_evidence(model_id: str) -> PackageEvidence:
    for package in PACKAGES:
        if package.model_id == model_id:
            return package
    raise ValueError('Unknown embedding package.')
