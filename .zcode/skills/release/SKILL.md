---
name: release
description: Package GiantappWallpaper (the livewallpaper repository) into an NSIS installer and release it. Use when the user wants to package / release / publish / launch a new version (release, package, publish). Asks whether it is an official release or a preview release, auto-increments the version tail number and syncs three files, collects update records and always writes them to the top of docs/2.更新记录.md, and finally asks whether to automatically publish a GitHub Release (including the installer artifact).
---

<objective>
One flow completes a release: determine release type -> tail number +1 -> collect update records -> write changelog -> build NSIS installer -> (optional) publish GitHub Release.
This skill is bound to the livewallpaper repository (GiantappMan/livewallpaper, Tauri 2 + NSIS), used within this repository's workspace.
</objective>

<quick_start>
Preflight (git status / current version) -> AskUserQuestion "official or preview?" -> version.ts next to compute new version -> ask user for update records -> version.ts apply to increment tail number and write in three places -> insert this version entry at the top of docs/2.更新记录.md -> bun run build to produce the NSIS installer -> AskUserQuestion "publish to GitHub?" -> (when publishing) gh check / commit / tag / push / gh release create.
</quick_start>

<essential_principles>
- 全程用中文和用户交流：提问、选项文案、确认、进度播报和结果汇报一律用中文；代码、路径、命令、版本号、tag 等保持原样书写。
- Release type (official / preview) and whether to publish to GitHub must be asked; never infer or decide on behalf of the user.
- Update records must be collected on every release and always inserted at the top of `docs/2.更新记录.md` (sorted descending by version, newest on top); the same content is also used as the GitHub Release notes.
- The version number is written in three places (`src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src/giantapp-wallpaper-ui/package.json`); always use `scripts/version.ts apply` to modify them together. Hand-editing a single file is forbidden.
- `git push` and `gh release create` are irreversible external actions, and may only be executed after the user explicitly answers "publish".
- If the user has not provided update record content, ask until they do; fabricating update content on behalf of the user is forbidden.
</essential_principles>

<conventions>

| Item | Value |
|---|---|
| Versioning tool | `.zcode/skills/release/scripts/version.ts` (subcommands: current / next / apply) |
| Version files | `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src/giantapp-wallpaper-ui/package.json` |
| Cargo.lock | Auto-updated during build, committed together at release time |
| Changelog document | `docs/2.更新记录.md`, new version inserted at the top (after the `# 更新记录` heading) |
| Preview version suffix | `alpha.N` (inheriting the repository convention; can be changed to beta as requested by the user) |
| Packaging command | `bun run build` (= `tauri build`, bundle target is NSIS) |
| Artifact | `src-tauri/target/release/bundle/nsis/GiantappWallpaper_<version>_x64-setup.exe` |
| Tag and Release title | `v<version>` (e.g. `v4.0.1`, `v4.0.1-alpha.1`) |
| Release repository | github.com/GiantappMan/livewallpaper, published via `gh` CLI |

</conventions>

<version_rules>
Tail number auto +1 (processed by `version.ts next`, do not recalculate manually):

- Current `4.0.0` (no suffix), official -> `4.0.1`
- Current `4.0.0` (no suffix), preview -> `4.0.1-alpha.1`
- Current `4.0.1-alpha.3`, preview -> `4.0.1-alpha.4` (preview sequence number +1, version segment unchanged)
- Current `4.0.1-alpha.3`, official -> `4.0.1` (version segment already +1 when the preview line started, official only removes the suffix)
</version_rules>

<process>

**1. Preflight**

- Run `git status --porcelain`; if there are uncommitted changes, list them and ask the user whether to continue directly (recommend committing or stashing first).
- Run `bun run .zcode/skills/release/scripts/version.ts current` to read the current version and inform the user.
- Can ask along the way whether to run `bun run test` first (skippable).

**2. Ask release type** (use AskUserQuestion)

- Official release: stable version, tag and version number have no suffix; GitHub Release is a formal release.
- Preview release: with `-alpha.N` suffix; GitHub Release is marked as prerelease.

After the user selects, run `bun run .zcode/skills/release/scripts/version.ts next <release|preview>` to compute the new version number, inform the user of the "current version -> new version" conclusion before continuing.

**3. Collect update records**

Ask the user directly in conversation: "Please provide the update record for this version (features / fixes both work, multiple lines allowed)". Wait for the user's reply and organize it into feature/fix lists. If the top of `docs/2.更新记录.md` already has an unreleased entry for the same version line (e.g. `## 4.1.0（……）` with all checkboxes ticked), ask the user: should this release's record be based directly on it (change the heading to the full version number with suffix, add release date) instead of starting a new section.

**4. Tail number +1**

Run `bun run .zcode/skills/release/scripts/version.ts apply <new version>` to write all three places in sync.

**5. Write changelog**

In `docs/2.更新记录.md`, insert a new section after the `# 更新记录` heading line (leave a blank line before and after), following the format of existing entries:

```markdown
## <version> 发布日期：<YYYY.M.D>

### 功能

- ...

### 修复

- ...
```

Date format like `2026.9.12`; if the user only mentioned fixes, the `### 功能` section can be omitted; if there are sub-items, use the same indented lists as the document's existing entries.

**6. Package**

- Run `bun run build` (Rust release build is slow, use run_in_background or a long timeout and wait for completion).
- Confirm the artifact exists under `src-tauri/target/release/bundle/nsis/` with `GiantappWallpaper_<version>_x64-setup.exe` (list the directory to confirm the filename).
- On build failure, fix the error; do not proceed to the publish step.

**7. Ask whether to publish to GitHub** (use AskUserQuestion: publish / not for now)

**Not for now** -> report the artifact path and version number, remind: version files and changelog have been modified but not committed; do not run this skill again before committing (otherwise the tail number will be +1 again), then end.

**Publish** -> execute in order:

1. Check the `gh` CLI: if not installed, first run `winget install --id GitHub.cli -e` (or guide the user to install it themselves); if not logged in (`gh auth status` fails), have the user run `gh auth login` themselves, or provide the `GH_TOKEN` environment variable, and continue only after confirming login.
2. `git add` three version files + `src-tauri/Cargo.lock` + `docs/2.更新记录.md`, commit with message `chore(release): v<version>`, then create tag `v<version>`.
3. `git push origin <current branch>`, then `git push origin v<version>`.
4. Write this version's section body from the changelog (excluding the `## <version>` heading line) to a temporary notes file, run `gh release create v<version> <installer path> --title "v<version>" --notes-file <notes file>`; for preview releases add `--prerelease`.
5. Report the Release URL and artifact location.

</process>

<success_criteria>
- The version number is consistent across tauri.conf.json, Cargo.toml, and ui package.json, and matches the tag and Release.
- The top of `docs/2.更新记录.md` gains an entry for this version, with the release date and record content provided by the user.
- The NSIS installer is successfully generated and the path reported.
- push and GitHub Release are only executed after the user explicitly confirms publishing; preview releases are marked as prerelease.
</success_criteria>
