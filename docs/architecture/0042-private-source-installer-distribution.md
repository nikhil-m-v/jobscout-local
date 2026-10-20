# 0042 — Private source and installer-only distribution

Adopted 2026-10-20 on the owner's explicit direction. Supersedes the original open-source/forkability objective for future JobScout development. Privacy, local processing and replaceable internal interfaces remain unchanged.

## Owner amendment — 2026-10-21

The owner explicitly authorizes source pushes regardless of repository visibility and plans to make the repository private when the first major release is achieved. This supersedes earlier instructions requiring private visibility before source publication. The repository remains public during this transition; do not describe its source or checked-in documentation as access-restricted during that period. Do not change repository settings on the owner's behalf. Installer-only application delivery remains the intended release policy; historical and third-party rights retain their existing treatment. The CI privacy gate remains unchanged, so public pushes stop before checkout, validation, packaging and artifact uploads.

## Decision

Users receive the Windows installer. First-party source, Git history, internal architecture/progress documents, fixtures, tests, CI reports, symbols, source maps and build tools remain restricted to authorized maintainers. There is no public source archive or automatic release publication. Keep the app usable locally; this policy does not authorize a hosted-model fallback, telemetry, DRM, accounts or provider requests.

The existing source repository was verified public on 2026-10-20. The owner explicitly chose to change its settings personally. Do not alter its settings or publish further source while it remains public. The workflow now requires private-repository metadata before checkout/testing/packaging. This guard cannot hide code already pushed to a public repository or remove old logs/copies. Verify current visibility again before any future push.

For future public installer delivery, use a separately reviewed download location or a distribution-only repository containing only approved public materials. Do not use the private source repository as a public release repository: GitHub source archives expose that repository's contents. No download destination or paid hosting is selected or authorized here.

## Existing licenses and ownership

The repository previously shipped an MIT license, retained verbatim in [LICENSE-LEGACY](../../LICENSE-LEGACY). This change does not withdraw permissions attached to copies already provided under that license, remove third-party notices, or assert ownership over others' contributions. Future original material is reserved under [LICENSE](../../LICENSE); previously licensed material retains its applicable terms. New branding/distribution policy alone does not turn previously MIT-licensed code into exclusively proprietary code.

Before public installer release, review ownership of incorporated contributions, finalize end-user terms and inventory the actual shipped dependencies. Include required copyright/license notices and satisfy any dependency source or redistribution obligations. Those compliance deliverables remain release gates, not completed by renaming the project or changing the top-level license.

The [MIT text](https://opensource.org/license/mit) grants broad rights for covered copies subject to its notice condition. GitHub documents that making a repository private [does not make public forks private](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility). Treat historical copies and licenses honestly; do not claim recall or retroactive exclusivity.

## Packaging controls and limits

`npm.cmd run package:installer` rebuilds the paired application, verifies the current restricted bundle configuration, checks built frontend files for source maps/raw development files, and stages exactly one installer in a fresh ignored export directory. A separate private audit records byte count and SHA-256. The CI installer artifact uses the exact staged executable path; reports and the audit stay in separate private artifacts. No directory-wide source/build upload is allowed.

The guard rejects base resources, additional external binaries or custom NSIS hooks/templates until explicitly reviewed. Amendment 2026-10-21: [23C](../23-dependency-notices.md) adds one generated build-only resource mapping for `licenses/THIRD-PARTY-NOTICES.txt`; private inventory and source paths are excluded. No directory-wide resource inclusion is allowed. The guard is an accidental-inclusion check over build inputs and the staged file, not forensic inspection of every byte inside NSIS or proof against a malicious build tool. Release payload/license review and signing remain open.

Built JavaScript and native/frozen binaries necessarily contain executable logic. [PyInstaller documents](https://pyinstaller.org/en/stable/operating-mode.html#hiding-the-source-code) that its compiled Python can be decompiled. Minification, bundling and source-map exclusion are not encryption or a guarantee against reverse engineering. More extensive native compilation or obfuscation would be a separate measured change; none is introduced here.

## Setup and upgrade

No new runtime dependency, model, permission, user account, data migration or provider access. Users continue using the installer and existing local setup. Version remains 0.1.0. Installer export is not approval to install, sign, release or claim acceptance of the newly built artifact.
