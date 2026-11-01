"""Reject stale certifi inputs and frozen trust bundles before desktop packaging."""
import argparse
import hashlib
from importlib.metadata import version
from pathlib import Path


# Reviewed PyPI wheel 42d35340cc5b9ba78e818ddbff0c5b1c2b779de448a340fd1b989f5fa8670e1b.
# GHSA-6q48-6c7w-9gw2: this bundle removes emSign ECC Root CA - G3.
# Update these together with pyproject.toml after reviewing a replacement bundle.
EXPECTED_VERSION = '2026.10.19'
EXPECTED_SHA256 = '50f79f98dac192b20dbf73f35c56f0b0c557ab267ff5199d1117cc1180b70785'
BUNDLE_PATH = 'certifi/cacert.pem'


def check_bundle(data):
    if hashlib.sha256(data).hexdigest() != EXPECTED_SHA256:
        raise ValueError('Certifi trust bundle differs from the reviewed bundle; refresh dependencies and rebuild.')


def check_installed():
    if version('certifi') != EXPECTED_VERSION:
        raise ValueError(f'Certifi {EXPECTED_VERSION} is required; refresh the engine dependencies before packaging.')
    import certifi
    if certifi.__version__ != EXPECTED_VERSION:
        raise ValueError('Imported certifi differs from its installed metadata.')
    check_bundle(Path(certifi.where()).read_bytes())


def open_archive(engine):
    from PyInstaller.archive.readers import CArchiveReader
    return CArchiveReader(str(engine))


def check_frozen(engine):
    archive = open_archive(engine)
    names = [n for n in archive.toc if n.replace('\\', '/').casefold() == BUNDLE_PATH]
    if len(names) != 1 or names[0].replace('\\', '/') != BUNDLE_PATH:
        raise ValueError('Frozen engine must contain exactly one canonical certifi trust bundle.')
    check_bundle(archive.extract(names[0]))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine', type=Path, help='Check embedded bytes instead of the installed package')
    args = parser.parse_args()
    try:
        if args.engine is None:
            check_installed()
        else:
            check_frozen(args.engine)
        print(f'Verified certifi {EXPECTED_VERSION} trust bundle ({"installed" if args.engine is None else "frozen"}).')
    except (ValueError, OSError, ImportError) as error:
        raise SystemExit(f'Certifi bundle check failed: {error}') from None
