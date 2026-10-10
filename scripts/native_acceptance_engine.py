"""Synthetic-only frozen sidecar for the isolated native acceptance launcher."""
import argparse
import os

from acceptance_engine import serve_synthetic


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--owner-pid', type=int, required=True)
    # The real shell supplies this argument. Never use it as personal-data storage.
    parser.add_argument('--data-dir', required=True)
    parser.add_argument('--port', type=int, choices=[0], required=True)
    args = parser.parse_args(argv)
    scenario = os.environ.get('JOBSCOUT_ACCEPTANCE_SCENARIO', 'complete')
    if scenario not in ('complete', 'failure'):
        parser.error('Use only the complete or failure synthetic scenario')
    serve_synthetic(args.owner_pid, scenario)


if __name__ == '__main__':
    from multiprocessing import freeze_support
    freeze_support()
    main()
