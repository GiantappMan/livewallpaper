# 构建脚本：一键构建前端 + Rust + NSIS 安装包
# 用法: cd src/build && ./compile.ps1 [-SkipMpv]

param(
    [switch]$SkipMpv = $false
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path "$PSScriptRoot/../.."
$UiDir = Join-Path $Root "src/giantapp-wallpaper-ui"
$TauriDir = Join-Path $Root "src-tauri"
$OutDir = Join-Path $PSScriptRoot "dist"
$MpvDir = Join-Path $TauriDir "assets/players/mpv"
$LibmpvDir = Join-Path $TauriDir "assets/players/libmpv"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "==> [1/4] 前端依赖与构建" -ForegroundColor Cyan
Push-Location $UiDir
if (-Not (Test-Path "node_modules")) { bun install }
Pop-Location
Push-Location $Root
bun --cwd src/giantapp-wallpaper-ui build
Pop-Location

# 从 shinchiro/mpv-winbuild-cmake 最新 release 解析资产直链（固定文件名会随
# 新版本失效，必须按模式动态挑选；排除需要 AVX2 的 -v3- 变体）
function Get-MpvAssetUrl([string]$Pattern) {
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/shinchiro/mpv-winbuild-cmake/releases/latest" -Headers @{ "User-Agent" = "GiantappWallpaper-build" }
    $asset = $rel.assets | Where-Object { $_.name -like $Pattern -and $_.name -notlike "*-v3-*" } | Select-Object -First 1
    if ($asset) { $asset.browser_download_url } else { $null }
}

if (-Not $SkipMpv) {
    Write-Host "==> [2/4] 准备 mpv" -ForegroundColor Cyan
    if (-Not (Test-Path (Join-Path $MpvDir "mpv.exe"))) {
        Write-Host "  未找到 mpv.exe，尝试从 GitHub 下载..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Force -Path $MpvDir | Out-Null
        # mpv 官方推荐 distributions 由 sourceforge 提供，此处用 GitHub 镜像
        $url = Get-MpvAssetUrl "mpv-x86_64-*.7z"
        try {
            if (-Not $url) { throw "release 中未找到 mpv-x86_64 资产" }
            Write-Host "  下载 $url"
            $tmp = Join-Path $env:TEMP "mpv-download.7z"
            Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
            # 7z 解压（有 7z 则用，否则提示手动放置）
            $sevenZip = Get-Command 7z -ErrorAction SilentlyContinue
            if ($sevenZip) {
                & 7z e $tmp ("-o" + $MpvDir) mpv.exe -y | Out-Null
            } else {
                Write-Host "  未找到 7z，请手动下载 mpv 放到 $MpvDir" -ForegroundColor Yellow
                Write-Host "  https://mpv.io/installation/"
            }
        } catch {
            Write-Host "  下载失败（$_），跳过。视频壁纸将回退到内置播放器。" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  mpv.exe 已就绪"
    }

    # 内嵌 mpv（libmpv-2.dll，随安装包内置分发）：取自同一 release 的 mpv-dev 包
    if (-Not (Test-Path (Join-Path $LibmpvDir "libmpv-2.dll"))) {
        Write-Host "  未找到 libmpv-2.dll，尝试从 GitHub 下载 mpv-dev 包..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Force -Path $LibmpvDir | Out-Null
        $url = Get-MpvAssetUrl "mpv-dev-x86_64-*.7z"
        try {
            if (-Not $url) { throw "release 中未找到 mpv-dev-x86_64 资产" }
            Write-Host "  下载 $url"
            $tmp = Join-Path $env:TEMP "libmpv-download.7z"
            Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
            $sevenZip = Get-Command 7z -ErrorAction SilentlyContinue
            if ($sevenZip) {
                & 7z e $tmp ("-o" + $LibmpvDir) "*.dll" -y | Out-Null
            } else {
                Write-Host "  未找到 7z，请手动解压 mpv-dev 包内的 DLL 放到 $LibmpvDir" -ForegroundColor Yellow
                Write-Host "  https://github.com/shinchiro/mpv-winbuild-cmake/releases"
            }
        } catch {
            Write-Host "  下载失败（$_），跳过。内嵌播放器将不可用并回退其他引擎。" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  libmpv-2.dll 已就绪"
    }
} else {
    Write-Host "==> [2/4] 跳过 mpv"
}

Write-Host "==> [3/4] Rust release 构建 + NSIS 打包" -ForegroundColor Cyan
Push-Location $Root
bun run build
Pop-Location

Write-Host "==> [4/4] 收集产物" -ForegroundColor Cyan
$bundle = Get-ChildItem (Join-Path $TauriDir "target/release/bundle/nsis") -Filter "*.exe" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($bundle) {
    Copy-Item $bundle.FullName $OutDir -Force
    Write-Host ""
    Write-Host "安装包: $(Join-Path $OutDir $bundle.Name)" -ForegroundColor Green
} else {
    Write-Host "未找到 NSIS 产物，请检查 tauri build 输出" -ForegroundColor Red
    exit 1
}
