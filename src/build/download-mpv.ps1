# mpv 播放器自动下载（打包/开发用）
#
# mpv.exe 不入库（.gitignore），新环境或打包机缺它时视频壁纸（mpv 播放器）
# 无法工作。本脚本从 shinchiro/mpv-winbuild-cmake（mpv 官网推荐的 Windows
# 构建渠道，与 4.x 相同来源）最新 release 下载 7z 包，解压到
# WallpaperCore/Assets/Players/Mpv/，随 MSBuild Publish 自动进安装包。
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File download-mpv.ps1              # 缺失时下载，已存在则跳过
#   powershell -ExecutionPolicy Bypass -File download-mpv.ps1 -Force       # 强制重新下载
#   powershell -ExecutionPolicy Bypass -File download-mpv.ps1 -PreferV3    # 选 AVX2 变体（默认选兼容性最好的 mpv-x86_64）
#   powershell -ExecutionPolicy Bypass -File download-mpv.ps1 -Url <7z直链> # 跳过 release 查询，直接下载指定包
param(
    [switch]$Force,
    [switch]$PreferV3,
    [string]$Url
)

$ErrorActionPreference = "Stop"
# IWR 显示进度条时大文件下载极慢，关掉
$ProgressPreference = "SilentlyContinue"

$TargetDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\giantapp-wallpaper-client\WallpaperCore\Assets\Players\Mpv"))
$TargetExe = Join-Path $TargetDir "mpv.exe"
$ReleaseApi = "https://api.github.com/repos/shinchiro/mpv-winbuild-cmake/releases/latest"
$SevenZiprUrl = "https://www.7-zip.org/a/7zr.exe"
# 下载与解压工具允许的主机白名单（重定向目标 objects.githubusercontent.com 一并放行）
$AllowedHosts = @("api.github.com", "github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com", "www.7-zip.org", "7-zip.org")

function Assert-AllowedUrl([string]$url) {
    $u = [Uri]$url
    if ($u.Scheme -ne "https" -and $u.Scheme -ne "http") {
        throw "仅允许 http/https 地址: $url"
    }
    # IPv6 字面量的 Host 带方括号（[::1]），先去掉再判断
    $h = $u.Host.ToLower().TrimStart("[").TrimEnd("]").TrimEnd(".")
    if ($h -eq "localhost" -or $h.EndsWith(".localhost") -or $h.EndsWith(".local") -or $h.EndsWith(".internal")) {
        throw "禁止私有地址: $url"
    }
    if ($h.Contains(":")) {
        # IPv6 仅放行全球单播（2000::/3），环回/唯一本地/链路本地一律拒绝
        if (-not ($h.StartsWith("2") -or $h.StartsWith("3"))) { throw "禁止环回/私有地址: $url" }
    }
    elseif ($h -match "^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$") {
        $a = [int]$Matches[1]; $b = [int]$Matches[2]; $c = [int]$Matches[3]
        $blocked = ($a -eq 0 -or $a -eq 10 -or $a -eq 127 -or
            ($a -eq 100 -and $b -ge 64 -and $b -le 127) -or
            ($a -eq 169 -and $b -eq 254) -or
            ($a -eq 172 -and $b -ge 16 -and $b -le 31) -or
            ($a -eq 192 -and $b -eq 168) -or
            ($a -eq 192 -and $b -eq 0) -or
            ($a -eq 198 -and $b -eq 51 -and $c -eq 100) -or
            ($a -eq 203 -and $b -eq 0 -and $c -eq 113) -or
            $a -ge 224)
        if ($blocked) { throw "禁止环回/私有/保留地址: $url" }
    }
    $ok = $false
    foreach ($suffix in $AllowedHosts) {
        if ($h -eq $suffix -or $h.EndsWith(".$suffix")) { $ok = $true; break }
    }
    if (-not $ok) { throw "主机不在允许列表内: $h（$url）" }
}

function Get-File([string]$url, [string]$outFile) {
    Assert-AllowedUrl $url
    Write-Host "[mpv] 下载 $url"
    Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing
    if (-not (Test-Path $outFile)) { throw "下载失败: $url" }
}

# ---- 0. 已存在则跳过 ----
if ((Test-Path $TargetExe) -and -not $Force) {
    Write-Host "[mpv] 已存在，跳过下载: $TargetExe"
    exit 0
}

$tmpDir = Join-Path ([IO.Path]::GetTempPath()) "mpv-download"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

try {
    # ---- 1. 确定下载地址 ----
    if ($Url) {
        $archiveUrl = $Url
    }
    else {
        Write-Host "[mpv] 查询最新 release（$ReleaseApi）"
        Assert-AllowedUrl $ReleaseApi
        $release = Invoke-RestMethod -Uri $ReleaseApi -UseBasicParsing
        $assets = @($release.assets | Where-Object { $_.name -match "^mpv-x86_64-\d{8}-git-[0-9a-f]+\.7z$" })
        if ($PreferV3) {
            $assets = @($assets | Where-Object { $_.name -match "mpv-x86_64-v3-" }) + @($assets | Where-Object { $_.name -notmatch "-v3-" })
        }
        else {
            $assets = @($assets | Where-Object { $_.name -notmatch "-v3-" }) + @($assets | Where-Object { $_.name -match "mpv-x86_64-v3-" })
        }
        if ($assets.Count -eq 0) { throw "最新 release（$($release.tag_name)）里没找到 mpv-x86_64 的 7z 包" }
        $archiveUrl = $assets[0].browser_download_url
        Write-Host ("[mpv] 选择 {0}（{1:N1} MB，tag {2}）" -f $assets[0].name, ($assets[0].size / 1MB), $release.tag_name)
    }

    # ---- 2. 下载 ----
    $archive = Join-Path $tmpDir ([IO.Path]::GetFileName(($archiveUrl -split "\?")[0]))
    Get-File $archiveUrl $archive

    # ---- 3. 找 7z 解压器：本机 7-Zip，否则下载官方独立 7zr.exe（约 0.6MB）----
    $sevenZip = @(Get-Command 7z -ErrorAction SilentlyContinue)[0].Source
    if (-not $sevenZip -and (Test-Path "$env:ProgramFiles\7-Zip\7z.exe")) { $sevenZip = "$env:ProgramFiles\7-Zip\7z.exe" }
    if (-not $sevenZip -and (Test-Path "${env:ProgramFiles(x86)}\7-Zip\7z.exe")) { $sevenZip = "${env:ProgramFiles(x86)}\7-Zip\7z.exe" }
    if (-not $sevenZip) {
        $sevenZip = Join-Path $tmpDir "7zr.exe"
        Get-File $SevenZiprUrl $sevenZip
    }

    $stage = Join-Path $tmpDir "extract"
    if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
    Write-Host "[mpv] 解压到临时目录…"
    & $sevenZip x $archive "-o$stage" -y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "7z 解压失败（exit $LASTEXITCODE）" }

    # ---- 4. 放到目标目录 ----
    Get-ChildItem $stage | Move-Item -Destination $TargetDir -Force
    if (-not (Test-Path $TargetExe)) { throw "解压产物里没有 mpv.exe" }

    $version = (& $TargetExe --version | Select-Object -First 1)
    Write-Host "[mpv] 完成 ✔ $TargetExe"
    Write-Host "[mpv] $version"
    exit 0
}
catch {
    Write-Host "[mpv] 下载失败：$($_.Exception.Message)"
    Write-Host "[mpv] 可手动下载 mpv 放到 $TargetDir（见 docs/1.开发.md），或检查网络后重试。"
    exit 1
}
finally {
    if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue }
}
