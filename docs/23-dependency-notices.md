# Milestone 23C — installer dependency notices

Status: build-time notice collection and one-file installer resource. Public release approval remains separate and incomplete. JobScout source remains private under [decision 0042](architecture/0042-private-source-installer-distribution.md); third-party and historical rights are preserved.

## Build contract

`npm.cmd run desktop:build` and `npm.cmd run package:installer` rebuild the engine, collect dependency metadata, and create a fresh ignored notice bundle before invoking Tauri. Development launch does not require generated notices. The separate synthetic installed-acceptance builder retains its existing contract and is not a distribution path.

The collector covers:

- npm's installed production dependency graph for the desktop workspace.
- Cargo's resolved Windows x64 dependency graph, conservatively including build dependencies. This is not an assertion that every listed crate is linked into the executable.
- Python distributions owning actual PyInstaller analysis inputs, including their named vendored license documents, plus CPython's license file.
- JobScout's preserved historical MIT notice.

Package/version/license declarations and deduplicated notice texts go into `THIRD-PARTY-NOTICES.txt`. No local dependency paths, source files, private inventory or build logs are included in that text. Missing package notice texts, unmapped site-package inputs, changed override checksums and development test tooling stop collection. Package-specific overrides are version-bound, checked in with provenance, and read offline; normal dependency installation/Cargo metadata resolution can still need network access.

Production builds add exactly that text through a generated Tauri configuration overlay, installed at `licenses/THIRD-PARTY-NOTICES.txt` under the application directory. Base bundle resources remain forbidden by the export guard; arbitrary resource directories, hooks and custom NSIS templates remain forbidden. The package audit includes the notice inventory, notice hash and unresolved manual-review categories; its CI artifact follows repository access settings. Export continues to contain only the installer executable. A passing build always records `releaseApproved: false` and `installedAcceptance: false`.

PyInstaller now explicitly excludes `pytest` and `_pytest`. This removes development test tooling discovered in the previous local build; engine behavior must remain covered by the engine suite and synthetic packaged-engine smoke checks.

## Native-input evidence

[Milestone 23F](23-native-dependency-review.md) adds exact native-input hashes, sizes and known wheel ownership to the private inventory, including package-owned binaries omitted by the older runtime-only name list. Packaging also verifies those bytes against the exact frozen engine archive and rejects missing/extra/changed identities or a stale engine hash. It records a finite review queue and covered-source delivery plan. No component is automatically cleared.

## Remaining release review

The collector establishes that named package-level texts were found, not that every embedded dependency's obligations have been discharged. Before public distribution:

1. Determine which MPL-covered components ship and provide a reliable source-availability notice for the exact covered versions and modifications. MPL permits a larger proprietary application while retaining obligations for covered files. See [Mozilla's FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/).
2. Review native/runtime binaries and nested vendored components, including incorporated libraries and runtime redistribution terms. CPython's notice alone does not establish full coverage of every DLL in a particular Python build; [Python's license documentation](https://docs.python.org/3.12/license.html) describes incorporated components separately. The private inventory lists runtime binary names for this review.
3. Finish first-party ownership/historical-grant review and end-user terms. The [PyInstaller exception](https://pyinstaller.org/en/stable/license.html) allows commercial bundles but does not remove dependent-library obligations.
4. Inspect the final installed payload and notice accessibility, sign and verify the intended release artifact, and complete the remaining milestone-23 acceptance gates.

No automated step claims legal clearance, publishes source or creates a public download. Repository visibility remains the owner's task. Source pushes are authorized regardless of visibility under the owner's 2026-10-21 amendment; private visibility is deferred until the first major release. Development, CI validation and packaging have no repository-visibility prerequisite. Synthetic CI inventories/audits may be uploaded with the repository's current access settings; visibility and installer-only delivery are release checkpoints.
