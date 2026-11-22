# 发布后把安装包同步上传到 Gitee / GitCode 的 Release 附件（.release.json postRelease 调用）。
# 两家平台 API 只认个人访问令牌，不支持账号密码 Basic Auth：
#   Gitee:   https://gitee.com/profile/personal_access_tokens （scope: projects）
#   GitCode: https://gitcode.com/settings/tokens （scope: projects）
# 令牌来源（不入仓库）：环境变量 GITEE_TOKEN / GITCODE_TOKEN，
#   或 %USERPROFILE%\.giantapp-release\tokens.json → { "gitee": "...", "gitcode": "..." }
# 任一平台未配置令牌 → 警告跳过；已配置但流程失败 → 非零退出（postRelease 链停止）。
# 发布流程注入的上下文: RELEASE_VERSION / RELEASE_CHANNEL / RELEASE_ARTIFACT / RELEASE_NOTES
param()
$ErrorActionPreference = "Stop"

$Owner = "GiantappMan"
$Repo = "livewallpaper"
$Version = $env:RELEASE_VERSION
$Artifact = $env:RELEASE_ARTIFACT
$Notes = $env:RELEASE_NOTES
$Tag = "v$Version"

if (-not $Version -or -not $Artifact -or -not (Test-Path $Artifact)) {
    Write-Error "缺少 RELEASE_VERSION/RELEASE_ARTIFACT 或安装包不存在: $Artifact"
    exit 1
}
if (-not $Notes) { $Notes = $Tag }

$FileName = Split-Path $Artifact -Leaf
$IsPrerelease = $Version -match "-"

# ---------- 令牌 ----------
function Get-Tokens {
    $tokens = @{}
    if ($env:GITEE_TOKEN)   { $tokens["gitee"]   = $env:GITEE_TOKEN }
    if ($env:GITCODE_TOKEN) { $tokens["gitcode"] = $env:GITCODE_TOKEN }
    $file = Join-Path $env:USERPROFILE ".giantapp-release\tokens.json"
    if (Test-Path $file) {
        $j = Get-Content $file -Raw -Encoding UTF8 | ConvertFrom-Json
        if (-not $tokens["gitee"] -and $j.gitee)     { $tokens["gitee"]   = $j.gitee }
        if (-not $tokens["gitcode"] -and $j.gitcode) { $tokens["gitcode"] = $j.gitcode }
    }
    return $tokens
}
$Tokens = Get-Tokens
if ($Tokens.Count -eq 0) {
    Write-Warning "未配置 Gitee/GitCode 令牌，跳过镜像 Release 上传（配置见脚本头部注释）"
    exit 0
}
Write-Host "镜像 Release 上传: $Tag <- $FileName (通道: $(if ($IsPrerelease) { 'preview' } else { 'stable' }), 平台: $($Tokens.Keys -join ', '))"

# ---------- 公共 ----------
$TempDir = Join-Path $env:TEMP "mirror-release-$Version"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    # PS5.1 Out-File 默认 UTF-16，curl 传 JSON 必须显式 UTF-8 无 BOM
    [IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}
function Invoke-CurlJson([string[]]$CurlArgs, [string]$Label) {
    # 返回 @{ Code; Body }，失败时打印响应体便于排查
    $outFile = Join-Path $TempDir "$Label-resp.json"
    $codeFile = Join-Path $TempDir "$Label-code.txt"
    & curl.exe -sS --max-time 60 @CurlArgs -o $outFile -w "%{http_code}" > $codeFile
    if ($LASTEXITCODE -ne 0) { Write-Error "[$Label] curl 退出码 $LASTEXITCODE"; exit 1 }
    $code = (Get-Content $codeFile -Raw).Trim()
    $body = (Get-Content $outFile -Raw -Encoding UTF8)
    return @{ Code = $code; Body = $body }
}

# tag 先推到对应镜像远端（release 依赖 tag；本地无则创建轻量 tag）
foreach ($remote in $Tokens.Keys) {
    git rev-parse -q --verify "refs/tags/$Tag" > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        git tag $Tag
        if ($LASTEXITCODE -ne 0) { Write-Error "本地创建 tag $Tag 失败"; exit 1 }
    }
    Write-Host "[$remote] 推送 tag $Tag ..."
    $pushOut = git push $remote "refs/tags/$Tag" 2>&1
    Write-Host ($pushOut -join "`n")
    if ($LASTEXITCODE -ne 0) { Write-Error "[$remote] tag 推送失败"; exit 1 }
}

$giteeBodyPath = Join-Path $TempDir "gitee-body.json"
$gitcodeBodyPath = Join-Path $TempDir "gitcode-body.json"

# ---------- Gitee ----------
if ($Tokens["gitee"]) {
    $t = $Tokens["gitee"]
    try {
        Write-Host "[gitee] 创建/确认 Release $Tag ..."
        Write-Utf8NoBom $giteeBodyPath (@{
            access_token = $t; tag_name = $Tag; name = $Tag
            body = $Notes; prerelease = $IsPrerelease
        } | ConvertTo-Json)
        $r = Invoke-CurlJson @("-X", "POST", "-H", "Content-Type: application/json",
            "--data-binary", "@$giteeBodyPath",
            "https://gitee.com/api/v5/repos/$Owner/$Repo/releases") "gitee-create"
        if ($r.Code -notmatch "^2") {
            # 已存在则按 tag 查回 release id 续传附件
            $r2 = Invoke-CurlJson @("https://gitee.com/api/v5/repos/$Owner/$Repo/releases/tags/$Tag`?access_token=$t") "gitee-get"
            if ($r2.Code -ne "200") { Write-Error "[gitee] 创建 Release 失败 HTTP $($r.Code): $($r.Body)"; exit 1 }
            $releaseId = ($r2.Body | ConvertFrom-Json).id
        } else {
            $releaseId = ($r.Body | ConvertFrom-Json).id
        }
        if (-not $releaseId) { Write-Error "[gitee] 未取到 release id"; exit 1 }

        Write-Host "[gitee] 上传附件 $FileName (release $releaseId) ..."
        $r3 = Invoke-CurlJson @("-X", "POST",
            "-F", "access_token=$t",
            "-F", "file=@$Artifact",
            "https://gitee.com/api/v5/repos/$Owner/$Repo/releases/$releaseId/attach_files") "gitee-attach"
        if ($r3.Code -notmatch "^2") { Write-Error "[gitee] 附件上传失败 HTTP $($r3.Code): $($r3.Body)"; exit 1 }

        # 验证：按 tag 回读，确认附件名存在
        $r4 = Invoke-CurlJson @("https://gitee.com/api/v5/repos/$Owner/$Repo/releases/tags/$Tag`?access_token=$t") "gitee-verify"
        $assets = ($r4.Body | ConvertFrom-Json).assets
        if (-not ($assets | Where-Object { $_.name -eq $FileName })) {
            Write-Error "[gitee] 验证失败：release 附件列表中未见 $FileName"; exit 1
        }
        Write-Host "[gitee] 完成 ✓ https://gitee.com/$Owner/$Repo/releases/tag/$Tag"
    } catch {
        Write-Error "[gitee] $_"
        exit 1
    }
} else {
    Write-Warning "[gitee] 未配置令牌，跳过"
}

# ---------- GitCode ----------
if ($Tokens["gitcode"]) {
    $t = $Tokens["gitcode"]
    try {
        Write-Host "[gitcode] 创建/确认 Release $Tag ..."
        Write-Utf8NoBom $gitcodeBodyPath (@{
            access_token = $t; tag_name = $Tag; name = $Tag
            body = $Notes; prerelease = $IsPrerelease
        } | ConvertTo-Json)
        $r = Invoke-CurlJson @("-X", "POST", "-H", "Content-Type: application/json",
            "--data-binary", "@$gitcodeBodyPath",
            "https://api.gitcode.com/api/v5/repos/$Owner/$Repo/releases") "gitcode-create"
        if ($r.Code -notmatch "^2") {
            $r2 = Invoke-CurlJson @("--get",
                "--data-urlencode", "access_token=$t",
                "https://api.gitcode.com/api/v5/repos/$Owner/$Repo/releases/tags/$Tag") "gitcode-get"
            if ($r2.Code -ne "200") { Write-Error "[gitcode] 创建 Release 失败 HTTP $($r.Code): $($r.Body)"; exit 1 }
        }

        Write-Host "[gitcode] 获取附件上传地址 ..."
        $r3 = Invoke-CurlJson @("--get",
            "--data-urlencode", "access_token=$t",
            "--data-urlencode", "file_name=$FileName",
            "https://api.gitcode.com/api/v5/repos/$Owner/$Repo/releases/$Tag/upload_url") "gitcode-uploadurl"
        if ($r3.Code -ne "200") { Write-Error "[gitcode] 获取上传地址失败 HTTP $($r3.Code): $($r3.Body)"; exit 1 }
        $up = $r3.Body | ConvertFrom-Json
        if (-not $up.url) { Write-Error "[gitcode] 上传地址响应缺少 url: $($r3.Body)"; exit 1 }

        Write-Host "[gitcode] 直传附件 $FileName ..."
        $putArgs = @("-X", "PUT", "--max-time", "900", "-T", $Artifact, $up.url)
        foreach ($p in $up.headers.PSObject.Properties) {
            $putArgs += @("-H", "$($p.Name): $($p.Value)")
        }
        & curl.exe -sS @putArgs -o (Join-Path $TempDir "gitcode-put.txt") -w "%{http_code}" > (Join-Path $TempDir "gitcode-put-code.txt")
        if ($LASTEXITCODE -ne 0) { Write-Error "[gitcode] OBS 直传 curl 退出码 $LASTEXITCODE"; exit 1 }
        $putCode = (Get-Content (Join-Path $TempDir "gitcode-put-code.txt") -Raw).Trim()
        if ($putCode -notmatch "^2") {
            Write-Error "[gitcode] OBS 直传失败 HTTP $putCode`: $((Get-Content (Join-Path $TempDir 'gitcode-put.txt') -Raw))"; exit 1
        }

        # 验证：按 tag 回读，确认附件名存在
        $r4 = Invoke-CurlJson @("--get",
            "--data-urlencode", "access_token=$t",
            "https://api.gitcode.com/api/v5/repos/$Owner/$Repo/releases/tags/$Tag") "gitcode-verify"
        $attachNames = (($r4.Body | ConvertFrom-Json).attach_files | ForEach-Object { $_.file_name }) -join ","
        if ($attachNames -notmatch [regex]::Escape($FileName)) {
            Write-Error "[gitcode] 验证失败：release 附件列表中未见 $FileName（现有: $attachNames）"; exit 1
        }
        Write-Host "[gitcode] 完成 ✓ https://gitcode.com/$Owner/$Repo/releases/tag/$Tag"
    } catch {
        Write-Error "[gitcode] $_"
        exit 1
    }
} else {
    Write-Warning "[gitcode] 未配置令牌，跳过"
}

Write-Host "镜像 Release 上传全部完成。"
exit 0
