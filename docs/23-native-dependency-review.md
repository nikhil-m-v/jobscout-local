# Milestone 23F — native dependency review evidence

Status: exact frozen-input inventory and embedded-native-byte verification implemented; component clearance and source delivery remain open. No new dependency, application behavior, setup step or installer resource.

## Reproducible inventory

The normal notice collector now adds `nativeBinaryInputs` to its private inventory: filename, SHA-256, byte size, distribution name/version where metadata owns the file, and `reviewStatus: pending`. It covers DLL, PYD and EXE inputs present in PyInstaller analysis, including wheel-owned extensions. Different contents sharing a filename remain distinct. Machine-specific paths are omitted. Unknown ownership stays null; the collector never guesses a license from a filename. Empty or unreadable selected binaries fail collection.

`runtimeBinariesForReview` remains for compatibility. The new field is additive to inventory schema 1. The installed notice text and bundle resource mapping are unchanged. The hashes describe files at collection time; the additional archive check below proves inclusion in the selected engine. Native desktop linkage, bootloader, NSIS and installed/shared WebView runtime need separate review.

On 2026-10-23, offline collection using existing local npm/Cargo metadata and frozen analysis produced 342 component entries, 254 distinct notice texts and 70 native binary identities. One has wheel metadata ownership: pydantic_core 2.46.5. The other 69 require runtime/vendor provenance. This is local evidence, not a rebuilt or hosted installer result.

## Embedded native-byte verification

Production and installed-acceptance packaging now pass the exact sidecar path to notice collection. The collector reads its PyInstaller archive without executing the engine or writing extracted files. Every embedded DLL/PYD/EXE identity must match an analysis input by filename, SHA-256 and size, and every input identity must appear. Missing, additional or changed identities stop the build. Same-content copies in multiple archive directories are counted separately but share one identity. Destination layout is outside this identity check. Missing native paths in the analysis can no longer silently disappear from the input inventory.

`nativeArchiveVerification` binds the result to the complete engine hash and records identity/entry counts and scope. The engine hash is checked again after reading and by the JavaScript packaging guard before and after the native build. Older inventories without this evidence are rejected by packaging and must be regenerated. Standalone inventory collection can omit `--engine` for diagnosis, but that output cannot pass the packaging guard.

This verifies native bytes in the sidecar being supplied to packaging. It does not extract the final NSIS installer, identify upstream build provenance, verify licenses, or inspect statically linked libraries. PyInstaller transformations that change native input bytes intentionally fail this Windows comparison; any future strip/UPX or other transformation needs an explicit provenance design before use.

## Finite review queue

### 2026-10-27 local provenance review

The [dated 69-identity review inventory](reviews/23f-native-input-review-2026-10-27.json) supplements, rather than rewrites, the generated inventory. All distribution owners remain null, all license clearances remain unresolved, and release approval remains false. It records each exact filename/hash/size, archive destination, recorded build input relative to the runtime bundle, PE version resources, import dependencies, current-input comparison and explicit unresolved IDs. No machine-specific paths or raw compiler paths are published.

The selected inventory is `work/notices/build-iQk8o4/inventory.json`, SHA-256 `9e2a2ad28217f67b6519997414c18afc0e497d9c0b0e0d0e7c617b227eb6510b`, used by the covered-source checkpoint. Its retained engine is `b5a0a70546f0faa17746f5f71ae098e79bf23e534aac1e1a80364c9bafecf25a`. All 69 unknown-owner identities match bytes read directly from that engine's archive. Analysis and PKG staging records agree on all 69 input paths/destinations. These records identify the build's selected files; they do not attest the upstream compilation of those files. The one wheel-owned pydantic_core identity remains outside this review.

| Recorded supplier and binary evidence | Count | What remains unresolved |
|---|---:|---|
| Runtime `dependencies/python`: `python312.dll` and 19 PYD extensions; PE resources identify Python Software Foundation / Python 3.12.14 | 20 | Historical runtime archive, CPython source/revision, patches and compile/link inputs; complete nested/static vendor inventory |
| Runtime Python DLLs: `libcrypto-3-x64.dll`, `libssl-3-x64.dll`; PE version 3.5.8, crypto string `OpenSSL 3.5.8 25 Aug 2026` | 2 | Exact source, modifications, recipe and applicable notices bound to those bytes |
| Runtime Python DLLs: `sqlite3.dll`; PE version 3.53.1.0 and embedded source-id retained in inventory | 1 | Source-id reconciliation with source archive, patches, build record and notice disposition |
| Runtime Python DLLs: `libffi-8.dll`; no PE version resource; embedded libffi PDB suffix only | 1 | Exact source version/revision and build/notice evidence; ABI filename is insufficient |
| Runtime Python root: two VC runtime DLLs; Microsoft PE version 14.44.35211.0 | 2 | Original acquisition and exact-file redistribution basis. Both equal the installed VC Redist `14.44.35112/x64/Microsoft.VC143.CRT` copies, but equality grants no clearance |
| Runtime `dependencies/native/libheif/libheif/bin`: 42 API-set DLLs and `ucrtbase.dll`; Microsoft PE version 10.0.26100.4654 | 43 | Original Microsoft package/build and redistribution basis. None match candidates in the inspected installed SDK Redist trees |

The import tables tie `_ssl` to both OpenSSL DLLs, `_hashlib` to libcrypto, `_ctypes` to libffi, and `_sqlite3` to SQLite. The retained UCRT imports the collected core API-set names; VC/Python/vendor imports reference CRT API sets. This explains dependency relationships, not the historical search-path resolution algorithm or an exhaustive runtime load graph. Libheif itself is not among these 69 inputs; its directory supplied Microsoft files. Do not assign libheif's license or its dependency specifications to those files.

Static-vendor clues in the retained bytes include `expat_2.8.3` in pyexpat, `1.0.8, 13-Jul-2019` with libbzip2 diagnostics, and `2.5.1` with libmpdec symbols/path suffixes. Python contains `1.3.2` strings that are only a zlib-version candidate; the bounded inspection does not establish an exact LZMA version. Absence of a vendor DLL import does not establish a complete static component list. These clues are deliberately separate from verified source/build provenance.

**Runtime drift:** 45 recorded input identities still match disk; the 20 Python binaries and four vendor DLLs do not. The current runtime manifest reports bundle `26.1025.11240`, Python 3.12.14, Windows x64. It is a current bundle descriptor, not a historical build manifest for the selected sidecar. The current libheif descriptor names 1.23.2, a source URL/hash and four package specs, but provides no mapping for the 43 Microsoft files. The current Python `LICENSE.txt` matches the selected CPython notice after the collector's BOM/newline normalization (raw file hashes are not comparable to normalized notice hashes). That text match does not bind the changed binaries to their historical source or establish complete vendor notice coverage. Do not substitute current headers, notices or same-version binaries for historical evidence. No runtime or engine was rebuilt/replaced during this review.

### Evidence method and bounded next actions

The review used `ast.literal_eval` for Analysis/PKG records, PyInstaller `CArchiveReader` to read native bytes in memory, SHA-256/size joins, and `pefile` to read PE version/import tables without executing the binaries. The JSON binds inventory, sidecar, Analysis, PKG and inspected repository/current-runtime metadata hashes. The installed VC and Windows SDK Redist scans inspected 6 and 204 filename-selected DLL candidates respectively. PE self-description is not signature verification; no online signature/revocation or upstream lookup was performed. Local investigation scripts and fuller comparisons are retained under ignored `work/native-review/2026-10-27/`.

Work that needs **no external approval** includes preserving/rechecking these local artifacts, inspecting locally available build/link/source/notice records, reconciling collected notice text, extracting and mapping the retained final installer, and preparing a deterministic runtime input manifest for future builds. Those activities can close evidence gaps if the necessary local material exists; they cannot manufacture a missing upstream build record. Refreshing a build inventory must keep this dated snapshot and explicitly account for the 24 changed inputs. A rebuild is not required to review the retained artifact.

External **evidence** is still needed if the exact historical runtime/vendor source and build records cannot be found locally: acquisition artifact/checksum, source revisions and patch sets, compiler/linker inputs and the originating Microsoft redistribution package/terms. Obtaining evidence and approving redistribution are separate steps. No permission request is needed to continue local investigation. Vendor contact, new downloads/network acquisition, publishing a recipient source location, changing release terms or granting final release approval are not performed or authorized by this local review. The remaining R1–R9 items in the inventory spell out those gaps, including final installer/static desktop/bootloader/WebView/source-delivery work outside this 69-file scope.

| Area | Evidence to retain before disposition |
|---|---|
| CPython extensions and embedded vendors | Exact runtime build provenance; identify incorporated compression, XML, decimal and other libraries against source/build manifests; reconcile their notices with collected texts. |
| OpenSSL, SQLite and libffi DLLs | Match each recorded hash to exact upstream/build version, modifications and applicable notice text. Filename versions alone are insufficient. |
| Microsoft runtime and API-set DLLs | Identify the originating redistributable/build and applicable redistribution terms for the exact binaries. |
| pydantic_core native extension | Match wheel/version/hash to source and nested Rust/vendor inventory; package ownership is not transitive license clearance. |
| Desktop, bootloader, NSIS, WebView | Independently inventory final artifact components, distinguish shipped files from prerequisites/downloads and build-only tools, and retain exact license/provenance evidence. |

Python documents incorporated software separately and calls its online list incomplete; the exact runtime build still needs reconciliation. See [Python license documentation](https://docs.python.org/3.12/license.html). The [PyInstaller exception](https://pyinstaller.org/en/stable/license.html) allows commercial bundles subject to dependency licenses; do not treat a package-level GPL string as the complete disposition.

## Covered-source delivery plan

### Offline archive preparation

`scripts/prepare_covered_sources.py` prepares evidence for MPL-2.0 candidates in a selected notice inventory. It uses the accompanying Cargo metadata, current lockfile and existing local crate cache. It never downloads sources or extracts archives. Run it with a fresh ignored output directory:

```powershell
.venv\Scripts\python.exe scripts/prepare_covered_sources.py `
  --inventory work/notices/<selected-build>/inventory.json `
  --cargo work/notices/<selected-build>/cargo.json `
  --lock apps/desktop/src-tauri/Cargo.lock `
  --cache "$env:USERPROFILE/.cargo/registry/cache" `
  --output work/covered-sources/<new-review>
```

For supported crates.io candidates, it requires an unambiguous exact name/version in metadata and the lockfile, verifies the archive SHA-256 against Cargo.lock, and compares every archived file with the cached source directory identified by that metadata. Missing, changed or additional source files fail; only Cargo's two cache markers are excluded. Unsafe paths, archive links, duplicate paths, corrupt duplicate cache entries and oversized archives fail before output is created. Existing output directories are never overwritten. This comparison describes cached source at review time; it cannot prove historical compiler inputs or the absence of external build-script inputs.

The resulting `source-review.json` binds the input inventory and lockfile by hash, records retained archive hashes, sizes and compared-file counts, and leaves shipped-component disposition/review pending. Its records omit machine-specific source paths. Missing archives and unsupported ecosystems remain explicit unresolved entries; a successful command does not mean all candidates are resolved. Archives and reports stay in ignored `work/`, outside installer resources and source-control publication.

The 2026-10-25 offline run retained five exact Cargo archives and compared all 66 archived files successfully. The sixth candidate, certifi, remains unresolved because this tool does not provide a Python source-archive collector. The selected inventory was from the existing 23F build; no new installer was built. Runtime provenance, nested/static vendors, recipient delivery and final-installer mapping are still separate gates. There was no runtime build-provenance manifest in the inspected local Python installation, so runtime attribution has not advanced to clearance.

The observed metadata flags MPL-2.0 candidates cssparser 0.37.0, cssparser-macros 0.7.1, dtoa-short 0.3.5, option-ext 0.2.0, selectors 0.38.0 and certifi 2026.7.22. Cargo coverage is conservative and includes build tools; these are review candidates, not confirmed shipped components. Recompute the list after dependency changes.

1. Resolve each candidate to shipped material or documented build-only exclusion using the final build and archive/link evidence.
2. For shipped covered material, retain exact source archives, upstream revision, checksums, modifications (including an explicit no-modifications disposition where verified), and license/notice files. Review nested vendors independently.
3. Prepare a versioned source-delivery manifest and recipient-facing source-location notice. Choose and verify a durable distribution location before release; no location or source availability is promised yet.
4. Verify recipients can obtain the corresponding covered source and notices for the exact installer, then record reviewer, date, installer hash and evidence. Preserve this mapping for released versions.

Mozilla explains source availability and recipient notices for executable distribution in its [MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/). This plan prepares evidence for that review; it does not grant release approval or change first-party distribution terms. Historical ownership, end-user terms, signing and the remaining product acceptance gates stay open.
