"""Offline 24B developer review; never installs, acquires or runs a model.

All paths are explicit. Output can contain the selected local destination: keep
real-path reviews out of committed evidence. Run with the existing engine Python.
"""
import argparse
import json

from jobscout_engine.embedding_packages import PACKAGES
from jobscout_engine.embedding_review import (
    PreflightFailure, REUSE_DISCLOSURE, review_embedding_preflight,
)


def main():
    parser = argparse.ArgumentParser(description=__doc__, epilog=REUSE_DISCLOSURE)
    parser.add_argument('--model', choices=[item.model_id for item in PACKAGES], required=True)
    parser.add_argument('--model-folder', required=True)
    parser.add_argument('--app-folder', required=True)
    parser.add_argument('--data-folder', required=True)
    parser.add_argument('--retained-data-folder', action='append', default=[])
    parser.add_argument('--shared-folder', action='append', default=[],
                        help='Declare every shared runtime/model root; no inventory is queried.')
    parser.add_argument('--file', nargs=2, metavar=('ROLE', 'PATH'), action='append', default=[],
                        help='Explicit manifest/config/model/license/params file; no name inference.')
    parser.add_argument('--inspect-selected-files', action='store_true', help=REUSE_DISCLOSURE)
    for name in ('working', 'runtime', 'recovery', 'reserve'):
        parser.add_argument('--' + name + '-bytes', type=int, required=True,
                            help='Explicit additional destination-volume cost, including reviewed zero.')
    args = parser.parse_args()
    try:
        result = review_embedding_preflight(
            args.model, destination=args.model_folder,
            protected_folders=(args.app_folder, args.data_folder, *args.retained_data_folder),
            shared_folders=tuple(args.shared_folder),
            selected_files=tuple(map(tuple, args.file)),
            inspect_selected_files=args.inspect_selected_files,
            working_bytes=args.working_bytes, runtime_bytes=args.runtime_bytes,
            recovery_bytes=args.recovery_bytes, reserve_bytes=args.reserve_bytes)
    except (PreflightFailure, ValueError) as error:
        # Never include exception text: OS paths and other caller values stay local.
        print(json.dumps({'status': 'review_failed', 'code': str(error)
                          if isinstance(error, PreflightFailure) else 'invalid_review_input'}))
        return 2
    print(json.dumps(result, indent=2))
    return 0  # A completed review is not acquisition or release approval.


if __name__ == '__main__':
    raise SystemExit(main())
