# Dependency notice overrides

`license-overrides.json` records exact package versions whose downloaded Cargo package omits a full notice document. Each checked-in text has a SHA-256 checksum and retrieval URL. The collector refuses changed bytes or paths outside `packaging/licenses`. Refresh overrides deliberately when a dependency version changes; do not match names without versions or fetch notices automatically during builds.

Six crates use documents from the Git revision recorded in their `.cargo_vcs_info.json`. `selectors` 0.38.0 is the exception: its recorded Stylo revision has MPL headers but no full MPL text. Its override contains Mozilla's official MPL 2.0 text, with that provenance recorded explicitly. No copyright holder was invented. These files were retrieved on 2026-10-21.

This is notice preservation, not license approval or a complete source-availability service. See [the installer notice contract](../docs/23-dependency-notices.md) for scope and remaining release gates.
