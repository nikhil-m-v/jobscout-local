# Milestone 23F — native dependency review evidence

Status: exact frozen-input inventory implemented; component clearance and source delivery remain open. No new dependency, application behavior, setup step or installer resource.

## Reproducible inventory

The normal notice collector now adds `nativeBinaryInputs` to its private inventory: filename, SHA-256, byte size, distribution name/version where metadata owns the file, and `reviewStatus: pending`. It covers DLL, PYD and EXE inputs present in PyInstaller analysis, including wheel-owned extensions. Different contents sharing a filename remain distinct. Machine-specific paths are omitted. Unknown ownership stays null; the collector never guesses a license from a filename. Empty or unreadable selected binaries fail collection.

`runtimeBinariesForReview` remains for compatibility. The new field is additive to inventory schema 1. The installed notice text and bundle resource mapping are unchanged. The hashes describe files at collection time, not independently extracted final-installer bytes. PyInstaller analysis is an input inventory, not proof of final inclusion. Native desktop linkage, bootloader, NSIS and installed/shared WebView runtime need separate review.

On 2026-10-23, offline collection using existing local npm/Cargo metadata and frozen analysis produced 342 component entries, 254 distinct notice texts and 70 native binary identities. One has wheel metadata ownership: pydantic_core 2.46.5. The other 69 require runtime/vendor provenance. This is local evidence, not a rebuilt or hosted installer result.

## Finite review queue

| Area | Evidence to retain before disposition |
|---|---|
| CPython extensions and embedded vendors | Exact runtime build provenance; identify incorporated compression, XML, decimal and other libraries against source/build manifests; reconcile their notices with collected texts. |
| OpenSSL, SQLite and libffi DLLs | Match each recorded hash to exact upstream/build version, modifications and applicable notice text. Filename versions alone are insufficient. |
| Microsoft runtime and API-set DLLs | Identify the originating redistributable/build and applicable redistribution terms for the exact binaries. |
| pydantic_core native extension | Match wheel/version/hash to source and nested Rust/vendor inventory; package ownership is not transitive license clearance. |
| Desktop, bootloader, NSIS, WebView | Independently inventory final artifact components, distinguish shipped files from prerequisites/downloads and build-only tools, and retain exact license/provenance evidence. |

Python documents incorporated software separately and calls its online list incomplete; the exact runtime build still needs reconciliation. See [Python license documentation](https://docs.python.org/3.12/license.html). The [PyInstaller exception](https://pyinstaller.org/en/stable/license.html) allows commercial bundles subject to dependency licenses; do not treat a package-level GPL string as the complete disposition.

## Covered-source delivery plan

The observed metadata flags MPL-2.0 candidates cssparser 0.37.0, cssparser-macros 0.7.1, dtoa-short 0.3.5, option-ext 0.2.0, selectors 0.38.0 and certifi 2026.7.22. Cargo coverage is conservative and includes build tools; these are review candidates, not confirmed shipped components. Recompute the list after dependency changes.

1. Resolve each candidate to shipped material or documented build-only exclusion using the final build and archive/link evidence.
2. For shipped covered material, retain exact source archives, upstream revision, checksums, modifications (including an explicit no-modifications disposition where verified), and license/notice files. Review nested vendors independently.
3. Prepare a versioned source-delivery manifest and recipient-facing source-location notice. Choose and verify a durable distribution location before release; no location or source availability is promised yet.
4. Verify recipients can obtain the corresponding covered source and notices for the exact installer, then record reviewer, date, installer hash and evidence. Preserve this mapping for released versions.

Mozilla explains source availability and recipient notices for executable distribution in its [MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/). This plan prepares evidence for that review; it does not grant release approval or change first-party distribution terms. Historical ownership, end-user terms, signing and the remaining product acceptance gates stay open.
