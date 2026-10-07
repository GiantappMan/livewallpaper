---
name: release
description: Package GiantappWallpaper (the livewallpaper repository) into an NSIS installer and release it. Use when the user wants to package / release / publish / launch a new version (release, package, publish). Asks whether it is an official release or a preview release, auto-increments the version tail number and syncs three files, collects update records and always writes them to the top of docs/2.更新记录.md, then asks about two optional publish targets: the Cloudflare update channel (stable / preview manifests for the in-app updater, via scripts/publish.ts) and a GitHub Release (including the installer artifact).
---

<objective>
One flow completes a release: determine release type -> tail number +1 -> collect update records -> write changelog -> build NSIS installer -> (optional) publish to the Cloudflare update channel (stable / preview) -> (optional) publish a GitHub Release.
This skill is bound to the livewallpaper repository (GiantappMan/livewallpaper, Tauri 2 + NSIS), used within this repository's workspace.
</objective>

<quick_start>
Preflight (git status / current version) -> AskUserQuestion "official or preview?" -> version.ts next to compute new version -> ask user for update records -> version.ts apply to increment tail number and write in three places -> insert this version entry at the top of docs/2.更新记录.md -> bun run build to produce the NSIS installer -> AskUserQuestion "publish to Cloudflare update channel?" (channel follows the release type: official -> stable.json, preview -> preview.json; run scripts/publish.ts --skip-build) -> AskUserQuestion "publish to GitHub?" -> (when publishing) gh check / commit / tag / push / gh release create.
</quick_start>

<essential_principles>
- 全程用中文和用户交流：提问、选项文案、确认、进度播报和结果汇报一律用中文；代码、路径、命令、版本号、tag 等保持原样书写。
- Release type (official / preview) and whether to publish (Cloudflare channel / GitHub) must be asked; never infer or decide on behalf of the user.
- Update records must be collected on every release and always inserted at the top of `docs/2.更新记录.md` (sorted descending by version, newest on top); the same content is also used as the GitHub Release notes and the `--notes` of the Cloudflare publish.
- The version number is written in three places (`src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src/giantapp-wallpaper-ui/package.json`); always use `scripts/version.ts apply` to modify them together. Hand-editing a single file is forbidden.
- `git push`, `gh release create` and `scripts/publish.ts`（上传 Cloudflare）are irreversible external actions, and may only be executed after the user explicitly confirms the respective target.
- Cloudflare 凭据不经手：发布前只检测 `bunx wrangler@4 whoami`；未登录/不可用时提示用户自己执行 `bunx wrangler@4 login`（OAuth 凭据存本机用户目录），并把用户明确的拒绝/取消如实终止流程，绝不把任何凭据写入仓库或环境变量。
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
| Cloudflare publish | `bun run scripts/publish.ts <release|preview> --skip-build --notes "<更新记录>"`（正式版→stable 通道，预览版→preview 通道；详细机制见 `docs/6.更新与发布.md`） |
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
- On build failure, fix the error; do not proceed to the publish steps.

**7. Ask whether to publish to the Cloudflare update channel** (use AskUserQuestion: publish / not for now)

应用内「程序更新」与「界面热更新」都从该渠道拉取（界面热更新地址留空时自动跟随通道）。通道与发布类型一一对应：**正式版 → release 通道（stable.json），预览版 → preview 通道（preview.json）**。脚本会**同时打包并上传界面热更新本体**（`ui/ui-<版本>.zip`，取自当前前端 dist，与安装包内置界面同一份构建），并且**严格只更新所选通道的清单**：正式版 → `stable.json` + `ui/stable.json`；预览版 → `preview.json` + `ui/preview.json`——另一通道完全不受影响（正式版可加 `--sync-preview` 把程序与界面清单一起同步到预览通道）。程序更新与界面热更新一次发布同时覆盖，界面热更新无需单独操作。

**Not for now** -> skip to step 8.

**Publish** -> execute in order:

1. 检测登录：`bunx wrangler@4 whoami`。失败/未登录/输出版本帮助文本时，提示用户自己执行 `bunx wrangler@4 login`（浏览器 OAuth，凭据存本机，不入仓库；也可用 `CLOUDFLARE_API_TOKEN` 环境变量），等用户确认已登录后重试检测；用户放弃则终止本步并告知可稍后手动执行发布命令。
2. 运行 `bun run scripts/publish.ts <release|preview> --skip-build --notes "<本次更新记录（步骤 3 收集的内容）>"`。脚本幂等：部署 Worker → 确保 R2 桶 → 上传安装包 + 界面包 + 通道清单 → 打印接入地址。`*.workers.dev` 不可达的网络环境提示可用 `CF_WORKER_URL` 绑定自定义域名后重发。
3. 正式版如需让预览通道用户也收到（覆盖 preview.json + ui/preview.json），追加 `--sync-preview`（先询问用户）。
4. 汇报脚本输出的清单地址与**固定下载入口**：`<worker地址>/dl/latest`（正式版安装包）、`/dl/latest-preview`（预览版）——壁纸服务端 / 官网的下载地址配置一次即可，发布后自动 302 到最新安装包，无需每次改服务端；如站点仍指向旧地址，提醒用户更新为该固定入口。
5. 构建期可用 `GIANTAPP_UPDATE_URL=<worker地址> bun run build` 把默认更新源烧进安装包（仅全新安装生效）。

**8. Ask whether to publish to GitHub** (use AskUserQuestion: publish / not for now)

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
- push, Cloudflare publish, and GitHub Release are only executed after the user explicitly confirms the respective target; the Cloudflare channel matches the release type (official -> stable.json, preview -> preview.json); preview releases are marked as prerelease on GitHub.
- When Cloudflare is not logged in, the user is guided to log in themselves (`bunx wrangler@4 login`), and no credentials are ever written to the repository.
</success_criteria>
