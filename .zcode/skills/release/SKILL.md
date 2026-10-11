---
name: release
description: Package and release 巨应壁纸3 (the livewallpaper_v3 repository, C# WPF + WebView2, branch v3.x). Use when the user wants to package / release / publish / launch a new version (release, package, publish, 发布). Asks whether it is an official or preview release, auto-increments the version and syncs Client.csproj + Package.appxmanifest, collects update records into docs/2.更新记录.md, then asks which release channels to ship: the normal installer (Inno Setup, update detection via 4.x-style stable.json/preview.json manifests on releases.giantapp.cc under the wallpaper3/ prefix, guides users to download) and/or the Microsoft Store (build MSIX upload package for Partner Center; update detection is handled by the Store itself, never guides users to download installers). Optionally publishes a GitHub Release.
---

<objective>
One flow completes a release: determine release type -> compute new version -> collect update records -> write changelog -> build artifact(s) -> per-channel update detection: normal installer publishes a 4.x-style update manifest (users are guided to download the new installer); Microsoft Store builds an .msixupload for Partner Center (updates come from the Store itself, no download guidance) -> (optional) GitHub Release.
This skill is bound to the livewallpaper_v3 repository (GiantappMan/livewallpaper, branch v3.x), used within this repository's workspace.
</objective>

<quick_start>
Preflight (git status / current version, both client and store) -> AskUserQuestion "official or preview?" -> version.ts next to compute new version -> ask release channel (installer / Microsoft Store / both) -> ask user for update records -> version.ts apply to write Client.csproj + Package.appxmanifest -> insert this version entry into docs/2.更新记录.md -> build (compile.ps1 for the Inno Setup installer; msbuild StoreUpload for the Store package) -> installer channel: publish manifest with scripts/publish.ts (wallpaper3/ prefix on releases.giantapp.cc) -> store channel: hand the .msixupload to the user for Partner Center submission (updates detected by the Store, no download guidance) -> AskUserQuestion "publish to GitHub?" -> (when publishing) gh commit / tag / push / gh release create.
</quick_start>

<essential_principles>
- 全程用中文和用户交流：提问、选项文案、确认、进度播报和结果汇报一律用中文；代码、路径、命令、版本号、tag 等保持原样书写。
- Release type (official / preview)、release channel (installer / Microsoft Store / both) and whether to publish (manifest / GitHub) must be asked; never infer or decide on behalf of the user.
- **渠道决定更新检测方式（本 skill 的核心规则）**：
  - **普通安装包**：走类似 4.x 的更新检测——发布版本清单到更新服务器，客户端/官网拉清单比较版本后**引导下载安装包**；
  - **微软商店**：更新检测由微软商店负责（用户经商店自动获得更新）——**不引导下载**：不为商店渠道发布安装包下载清单，不在商店版的更新说明里放安装包下载链接，商店版用户不出现任何「去官网/下载安装包更新」的引导。
- Update records must be collected on every release and written into `docs/2.更新记录.md`（版本列表最前，新版本在上）；same content is also used as the GitHub Release notes and the `--notes` of the manifest publish.
- 版本号写在两处（`Client.csproj` 的 `<Version>`、`Client.App/Package.appxmanifest` 的 `Identity Version`）；always use `scripts/version.ts apply` to modify them together. Hand-editing a single file is forbidden.
- `git push`、`gh release create`、`scripts/publish.ts`（上传 R2）都是不可逆的外部动作，may only be executed after the user explicitly confirms the respective target.
- Cloudflare 凭据不经手：发布前只检测 `bunx wrangler@4 whoami`；未登录/不可用时提示用户自己执行 `bunx wrangler@4 login`（OAuth 凭据存本机用户目录），并把用户明确的拒绝/取消如实终止流程，绝不把任何凭据写入仓库或环境变量。微软商店的 Partner Center 提交同理：登录与上传由用户自己完成。
- If the user has not provided update record content, ask until they do; fabricating update content on behalf of the user is forbidden.
</essential_principles>

<conventions>

| Item | Value |
|---|---|
| Versioning tool | `.zcode/skills/release/scripts/version.ts` (subcommands: current / store / next / apply) |
| Version files | `src/giantapp-wallpaper-client/Client/Client.csproj`（`<Version>`，安装包与 exe 文件版本）; `src/giantapp-wallpaper-client/Client.App/Package.appxmanifest`（`Identity Version`，商店数值四段，apply 自动推导） |
| Changelog document | `docs/2.更新记录.md`；新条目插在「## 模板」小节结束的 `---` 之后（版本列表最前） |
| Preview version suffix | `beta.N`（csproj 里用紧凑写法 `beta1`；changelog 标题沿用文档现状如 `v3.1.0-beta.0`，以 csproj 为准） |
| Installer packaging | `src/build/compile.ps1`（一键：前端构建 → MSBuild Publish → Inno Setup；脚本开头会等待按键 y/n 决定是否构建前端） |
| Installer artifact | `src/build/dist/LiveWallpaper_Installer_v<版本>.exe`（版本取自 exe 文件版本，以实际文件名为准） |
| Store packaging | `msbuild Client.App.wapproj /p:Configuration=Release /p:Platform=x64 /p:UapAppxPackageBuildMode=StoreUpload`，产物在 `Client.App/AppPackages/` 下的 `*.msixupload` |
| Manifest publish | `bun run .zcode/skills/release/scripts/publish.ts <release\|preview> --notes "<更新记录>"`（正式版→stable，预览版→preview；桶 `giantapp-releases`，产品前缀 `wallpaper3/`，需 `CF_R2_PUBLIC_URL=https://releases.giantapp.cc`） |
| Tag and Release title | `v<version>` (e.g. `v3.1.0`, `v3.1.0-beta2`) |
| Release repository | github.com/GiantappMan/livewallpaper（与 4.x 同仓库），分支 `v3.x`，published via `gh` CLI |

</conventions>

<update_channels>
两条发布渠道，更新检测方式不同，按用户选择的渠道执行对应分支：

**普通安装包（更新服务器清单，类似 4.x）**

- 清单格式与 4.x 完全一致，发布后形如 `https://releases.giantapp.cc/wallpaper3/stable.json`：

```json
{
  "version": "3.1.0",
  "url": "https://releases.giantapp.cc/wallpaper3/dl/LiveWallpaper_Installer_v3.1.0.exe",
  "notes": "更新说明",
  "date": "2026.10.10",
  "prerelease": false
}
```

- 通道：`release` → `wallpaper3/stable.json`，`preview` → `wallpaper3/preview.json`，严格单通道；正式版可加 `--sync-preview` 同步覆盖预览通道。
- 客户端/官网拉 `<地址>/<通道>.json`，宽松比较版本后引导下载 `url` 指向的安装包。v3 客户端目前尚未内置应用内检查（docs/2.更新记录.md 目标清单中「更新检查」未完成），清单先行发布即可接入。
- 安全约定：仓库不保存 Cloudflare 凭据（`wrangler login` 本机 OAuth）；清单只允许公网 http/https 地址（脚本已拒绝 localhost、环回、私有与保留地址）。

**微软商店（商店检测，不引导下载）**

- 用 WAP 项目（`Client.App`）构建 Store 上传包：msbuild 参数见 conventions；产物 `.msixupload` 交给用户在 Partner Center 提交审核（商店签名，本地不签名）。
- 商店包版本 = `Identity Version`（数值四段），`version.ts apply` 自动按无后缀版本推导；**同一版本重新提交商店时第四段 +1**（否则商店拒绝）。
- 更新检测完全由微软商店负责：用户经商店获得更新，**应用内与更新说明都不出现下载安装包的引导**；本渠道不执行 publish.ts、不写任何下载清单。
</update_channels>

<version_rules>
尾号自动 +1（processed by `version.ts next`, do not recalculate manually）：

- Current `3.1.0` (no suffix), official -> `3.1.1`
- Current `3.1.0` (no suffix), preview -> `3.1.1-beta1`
- Current `3.1.0-beta1`, preview -> `3.1.0-beta2` (preview sequence number +1, version segment unchanged)
- Current `3.1.0-beta1`, official -> `3.1.0` (version segment already +1 when the preview line started, official only removes the suffix)
</version_rules>

<process>

**1. Preflight**

- Run `git status --porcelain`; if there are uncommitted changes, list them and ask the user whether to continue directly (recommend committing or stashing first). Confirm current branch is `v3.x`.
- Run `bun run .zcode/skills/release/scripts/version.ts current`（客户端/安装包版本）与 `bun run .zcode/skills/release/scripts/version.ts store`（商店包版本）并告知用户。

**2. Ask release type** (use AskUserQuestion)

- Official release: stable version, tag and version number have no suffix; GitHub Release is a formal release.
- Preview release: with `-betaN` suffix; GitHub Release is marked as prerelease.

After the user selects, run `bun run .zcode/skills/release/scripts/version.ts next <release|preview>` to compute the new version number, inform the user of the "current version -> new version" conclusion before continuing.

**3. Ask release channel** (use AskUserQuestion)

- **普通安装包**：构建 Inno Setup 安装包，发布更新清单（引导下载）。
- **微软商店**：构建 .msixupload 交用户提交 Partner Center（商店检测，不引导下载）。
- **两者**：两条构建都做；清单与商店提交各自独立确认。

**4. Collect update records**

Ask the user directly in conversation: "Please provide the update record for this version (features / fixes both work, multiple lines allowed)". Wait for the user's reply and organize it into feature/fix lists. If `docs/2.更新记录.md` already has an unreleased entry for the same version line (e.g. `## v3.1.0-beta.0 发布日期：待定`), ask the user: should this release's record be based directly on it (change the heading to the actual version + release date) instead of starting a new section.

**5. Version +1**

Run `bun run .zcode/skills/release/scripts/version.ts apply <new version>` to write both version files in sync.

**6. Write changelog**

In `docs/2.更新记录.md`, insert the new section at the front of the version list（「## 模板」小节结束的 `---` 之后），following the format of existing entries:

```markdown
## <version> 发布日期：<YYYY.M.D>

### 功能

- ...

### 修复

- ...
```

Date format like `2026.10.10`; if the user only mentioned fixes, the `### 功能` section can be omitted; if there are sub-items, use the same indented lists as the document's existing entries.

**7. Build**（按步骤 3 选择的渠道）

- 安装包渠道：
  1. 前端：`cd src/giantapp-wallpaper-ui && pnpm i && pnpm build:client`（产物进 `Client/Assets/UI`；若本次发布的是 `giantapp-wallpaper-ui-3_0` 的界面改动，则在其目录执行同样的 `pnpm build:client`，两者输出同一目录）。compile.ps1 交互选 y 可代替此步。
  2. 运行 `powershell -ExecutionPolicy Bypass -File src/build/compile.ps1`（n 跳过前端构建；MSBuild Publish + Inno Setup 自动完成）。
  3. 列出 `src/build/dist/` 确认 `LiveWallpaper_Installer_v*.exe` 存在。构建失败先修复，不进入发布步骤。
- 微软商店渠道：
  1. 前端构建同上（WAP 打包同样内嵌 `Client/Assets/UI`）。
  2. `msbuild src/giantapp-wallpaper-client/Client.App/Client.App.wapproj /restore /p:Configuration=Release /p:Platform=x64 /p:UapAppxPackageBuildMode=StoreUpload`（项目已配置 x64 bundle、不签名）。
  3. 在 `Client.App/AppPackages/` 下找到 `*.msixupload`，确认包内版本号（来自 `Identity Version`）已随步骤 5 更新。

**8. Update detection / publish**（按渠道，各自用 AskUserQuestion 确认）

- 安装包渠道（发布清单，引导下载）：
  1. 检测登录：`bunx wrangler@4 whoami`。失败/未登录时提示用户自己执行 `bunx wrangler@4 login`，等确认后重试；放弃则终止本步并告知可稍后手动发布。
  2. `CF_R2_PUBLIC_URL=https://releases.giantapp.cc bun run .zcode/skills/release/scripts/publish.ts <release|preview> --notes "<本次更新记录>"`。正式版需让预览用户也收到时先询问，再加 `--sync-preview`。
  3. 汇报清单地址（`https://releases.giantapp.cc/wallpaper3/<通道>.json`）与安装包下载地址。
- 微软商店渠道（商店检测，不引导下载）：
  1. 把 `.msixupload` 路径告诉用户，由用户登录 Partner Center 提交（凭据不经手）。提交说明里提醒：商店版的更新由商店检测分发，更新说明中不放安装包下载链接。
  2. 商店渠道不做 stable/preview 区分（预览发布需求由用户在 Partner Center 处理）。

**9. Ask whether to publish to GitHub** (use AskUserQuestion: publish / not for now)

**Not for now** -> report artifact path(es) and version number, remind: version files and changelog have been modified but not committed; do not run this skill again before committing (otherwise the tail number will be +1 again), then end.

**Publish** -> execute in order:

1. Check the `gh` CLI: if not installed, first run `winget install --id GitHub.cli -e` (or guide the user to install it themselves); if not logged in (`gh auth status` fails), have the user run `gh auth login` themselves, or provide the `GH_TOKEN` environment variable, and continue only after confirming login.
2. `git add` 两个版本文件（`Client.csproj`、`Package.appxmanifest`）+ `docs/2.更新记录.md`，commit with message `chore(release): v<version>`, then create tag `v<version>`.
3. `git push origin v3.x`, then `git push origin v<version>`.
4. Write this version's changelog body (excluding the `## <version>` heading line) to a temporary notes file, run `gh release create v<version> <installer path> --title "v<version>" --notes-file <notes file>`; for preview releases add `--prerelease`；仅发布商店渠道时 release 不附安装包（附则与安装包渠道版本一致才可）。
5. Report the Release URL and artifact location(s).

</process>

<success_criteria>
- `Client.csproj` 的 `<Version>` 与 `Package.appxmanifest` 的 `Identity Version` 一致（数值四段 = 无后缀版本 + `.0`），tag / Release 与之一致。
- The top of the version list in `docs/2.更新记录.md` gains an entry for this version, with the release date and record content provided by the user.
- 所选渠道构建成功且产物路径已汇报：`src/build/dist/LiveWallpaper_Installer_v*.exe` 和/或 `Client.App/AppPackages/**/*.msixupload`。
- 安装包渠道：清单按发布类型写入对应通道（official -> stable.json, preview -> preview.json），只引导下载，发布前经用户确认。
- 微软商店渠道：只构建并交付 .msixupload，提交由用户完成；**不发布下载清单、不出现任何下载引导**。
- push、清单发布、GitHub Release 仅在用户明确确认后执行；凭据全程不经手（wrangler / gh / Partner Center 均由用户本机登录）。
</success_criteria>
