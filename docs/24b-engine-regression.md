# Milestone 24B engine-regression investigation — 2026-11-10

The reproduced stall is in Windows Python's internal socket-pair creation during
`TestClient` startup, before the JobScout lifespan or storage handler executes.
The bounded correction is to run the guarded diagnostic in an environment that
permits that private socket pair. No storage-route/product change is justified
by this evidence.

## History and exact stopping point

- `64afe1bc2b1ac5f4ab2a3cb5ecc7b24eff18366c` adds the 24B byte/space primitives,
  46 tests and documentation. It changes no storage route, app startup or dependency.
- Parent `2906a07` has the same storage test and handler. Storage inspection dates
  to `9d14791`; routing/lifespan work includes `1c3bafb` and `7746686`.
- The November 9 checkpoint records two broad commands without a result and a
  narrowed preflight-plus-storage retry that completed 46 tests before stalling.
  Retained temporary-directory names identify the initial broad-suite test as
  `test_harness_dispatch_is_synthetic_bounded_and_private`. No original hang stack
  was retained in that checkpoint, so the original runs cannot all be proved to
  share the newly observed cause.
- The narrowed reproduction stops at
  `apps/engine/tests/test_setup_storage.py:18`, inside
  `test_storage_route_is_private_read_only_and_does_not_use_other_services`, at
  `with TestClient(app) as client:`. No HTTP request has happened yet.

The blocking chain captured after five seconds is:

```text
test_setup_storage.py:18 -> TestClient.__enter__
  -> AnyIO start_blocking_portal -> asyncio new_event_loop
  -> Windows ProactorEventLoop._make_self_pipe
  -> socket._fallback_socketpair -> socket.accept
```

The test's main thread waits on the portal's future. The portal thread waits at
`socket.py:627` for the fallback pair's connection to be accepted. Instrumented
`WorkspaceLease.acquire`, `WorkspaceLocation.load`, `Database.initialize` and
`inspect_storage` never begin in the failing run. This excludes disk-usage
inspection, SQLite initialization and workspace leasing as the observed blocking
operation. A Selector-event-loop diagnostic reaches the same socket-pair hang.

The broad suite's first acceptance-preview case independently reproduces this
startup stack. A minimal `socket.socketpair()` smoke check, importing no JobScout
code, also hangs in the restricted environment and passes outside it.

## Bounded evidence

Source snapshots were extracted from tracked Git archives; personal app folders,
local credentials, models and real career records were not used. The original
checkout was not edited. The inspected working app/storage/test/preflight source
matches the 24B snapshot after normalizing Git line endings.

| Source / profile | Restricted environment | Normal environment with diagnostic guards |
| --- | --- | --- |
| 24B, runtime socket pair | 8-second deadline; blocked in accept | Pass, 0.09 s including supervisor |
| 24B, 46 preflight + 8 storage tests | 46 pass, then startup hang; stopped at 15 s | 54 pass; pytest 0.23 s, total 1.30 s |
| 24B, storage with Selector policy | Same startup hang; stopped at 15 s | Not rerun; policy change is unnecessary |
| 24B, initial acceptance-preview file | First parametrized case hangs; stopped at 15 s | 4 pass; pytest 0.26 s, total 1.24 s |
| 24B, storage + local check + database | Not rerun together | 32 pass; pytest 0.40 s, total 1.38 s |
| Pre-24B parent, storage | Same startup hang; stopped at 15 s | 8 pass; total 1.13 s |

Overlapping storage cases in the rows are not additional unique coverage. The
passing storage-route test checks 401 for missing/wrong tokens, 200 with an exact
`folder`/`free_bytes` response and no-store, 422 for query parameters, 405 for POST,
unchanged synthetic files across requests and no calls to injected services.

Interpreter/package receipt: Python 3.12.14; pytest 9.1.1; AnyIO 4.15.1;
Starlette 1.7.0; HTTPX 0.28.1; FastAPI 0.141.1. Passing pytest runs retain the
existing Starlette HTTPX deprecation warning. Dependencies were not changed.

## Safe reproduction and correction

Use `scripts/diagnose-storage-regression.py` (also supplied as the standalone
`reproduce_storage_hang.py`) with the existing test interpreter and a disposable
tracked-source snapshot. Create a fresh output directory; the runner always
creates a unique child directory and performs no recursive cleanup.

```powershell
# Substitute the existing interpreter, snapshot and output paths.
& $testPython $diagnostic --source $snapshot --profile runtime --output $receipts --seconds 8
& $testPython $diagnostic --source $snapshot --profile combined --output $receipts
& $testPython $diagnostic --source $snapshot --profile acceptance --output $receipts
& $testPython $diagnostic --source $snapshot --profile adjacent --output $receipts
```

First run `runtime` in the environment under investigation. If it times out, treat
that as infrastructure failure and preserve its stack/receipt. Repeat the guarded
checks in normal Windows PowerShell or an appropriately authorized execution
context that allows Python's private socket pair. The verified correction changes
the execution context only. Keep the default loop and all privacy guards; do not
remove assertions, skip the storage route or substitute a fake successful result.

Each invocation has a five-second diagnostic stack dump and an independent parent
deadline: eight seconds for the minimal smoke check, fifteen by default for tests,
with an explicit maximum of sixty seconds. Timeout returns 124 and terminates only
the retained child process handle. Child process creation is forbidden in the
diagnostic, so process-name sweeps and descendant guessing are unnecessary. A
TestClient/HTTP timeout alone would not bound this startup failure.

The supervisor supplies fresh TEMP/TMP/AppData/user-profile directories and an
allowlisted environment without provider keys, application tokens or proxy
variables. It disables pytest plugin autoload and bytecode/cache writing. It
prioritizes snapshot imports over the interpreter's editable installation.
Tests use synthetic tokens, records and injected services. Guards reject Python
DNS/bind/connect activity outside the internal socket-pair constructor, reject
real HTTPX transports, reject Windows credential operations and reject child
process launch. No live server, provider, model runtime or credential is needed.
The socket-pair exception permits its own transient loopback handshake; it grants
no access to an existing localhost service. Guards are diagnostic controls for
these reviewed profiles, not a general-purpose security sandbox.

The November 12 continuation adds a reviewed `full` profile selecting all engine
tests, without lifting the prohibitions. Use `--profile full --seconds 60` with
the same command shape. It also blocks multiprocessing start explicitly and
retains flushed per-phase `results.jsonl` and a final `junit.xml` alongside the
log/receipt. The suite contains real child-process, listener and vault cases:
under these guards those cases fail, and a full invocation is not automatically
full regression acceptance. See the [557-test results, thirteen guard failures
and native-crash limit](progress/2026-11-12.md). A separate integration supervisor
is needed before claiming those prohibited operations were exercised safely.

## Still unconfirmed

- The exact Windows/sandbox enforcement or WinSock rule preventing the internal
  handshake is not diagnosed. The environment contrast and pre-24B reproduction
  establish an infrastructure-specific failure here, not a universal Python bug.
- The original November 9 runs have no captured stacks proving identical causes.
- Complete engine regression acceptance is still open. These bounded profiles do
  not substitute for the entire suite, hosted CI, packaging or installed acceptance.
- No product fix or dependency update was made. The initial investigation
  used isolated snapshots. The owner subsequently requested applying,
  committing and pushing the diagnostic runner and checkpoint documents;
  raw evidence and generated snapshots remain excluded from publication.
- 24B remains partial: production artifact/license/NOTICE pins, runtime/storage
  choice and integrated destination/reuse review are open. Acquisition, inference,
  model-quality, earlier accessibility and release gates remain unchanged.
