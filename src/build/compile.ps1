# 一键打包：前端 -> dotnet publish -> Inno Setup 安装包
#
# 自动化/agent 环境直接运行（无交互）；跳过前端构建用 -SkipFrontend。
# 每一步都校验退出码与产物完整性，任何一步失败立即退出非零，
# 绝不产出半成品安装包（历史事故：前端构建失败被吞，打包出空 UI 变砖包）。
param([switch]$SkipFrontend)

$ErrorActionPreference = "Stop"

function DeletePath([String]$path) {
    if (Test-Path $path) {
        Remove-Item -path $path -Recurse -Force
        Write-Host ("delete path {0}..." -f $path)
    }
}

# ---- 1. 前端（giantapp-wallpaper-ui-3_0 静态导出 -> Client/Assets/UI）----
if (-not $SkipFrontend) {
    Set-Location "$PSScriptRoot\..\giantapp-wallpaper-ui-3_0"
    pnpm i
    if ($LASTEXITCODE -ne 0) { Write-Host "前端依赖安装失败，终止打包。"; exit 1 }
    pnpm run build:client
    if ($LASTEXITCODE -ne 0) { Write-Host "前端构建失败，终止打包。"; exit 1 }
    # 完整性标记：语言页 + chunk 目录必须存在（缺任一 = 空界面变砖包）
    if (-not (Test-Path "..\giantapp-wallpaper-client\Client\Assets\UI\zh.html") -or
        -not (Test-Path "..\giantapp-wallpaper-client\Client\Assets\UI\_next")) {
        Write-Host "前端产物不完整（缺 zh.html 或 _next），终止打包。"; exit 1
    }
}

# 返回 build 目录
Set-Location $PSScriptRoot

# ---- 2. mpv 播放器（目录被 gitignore，新环境必缺；缺失时自动下载）----
& "$PSScriptRoot\download-mpv.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "mpv 下载失败，安装包将缺少视频播放器（mpv），终止打包。"
    exit 1
}

# ---- 3. dotnet publish（Release，FolderProfile：x64 + win7-x64）----
DeletePath -path "$PSScriptRoot\publish"
dotnet publish "$PSScriptRoot\..\giantapp-wallpaper-client\Client\Client.csproj" -c Release -p:PublishProfile=FolderProfile
if ($LASTEXITCODE -ne 0) { Write-Host "dotnet publish 失败，终止打包。"; exit 1 }
if (-not (Test-Path "$PSScriptRoot\Publish\Assets\UI\zh.html") -or
    -not (Test-Path "$PSScriptRoot\Publish\Assets\UI\_next")) {
    Write-Host "发布产物缺少完整前端，终止打包。"; exit 1
}

# ---- 4. Inno Setup 打包（文件名带完整 semver：Windows 内部版本号拍平 -alpha 后缀，须从版本源头传）----
$csprojPath = "$PSScriptRoot\..\giantapp-wallpaper-client\Client\Client.csproj"
[xml]$csprojXml = Get-Content $csprojPath
$semVer = @($csprojXml.Project.PropertyGroup | Where-Object { $_.Version } | ForEach-Object { $_.Version })[0]
if (-not $semVer) { Write-Host "无法从 Client.csproj 读取版本号，终止。"; exit 1 }
Write-Host ("安装包版本: " + $semVer)
$innoSetup = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
$innoSetupScript = "$PSScriptRoot\installer.iss"
$innoSetupOutput = "$PSScriptRoot\dist"
DeletePath -path $innoSetupOutput
& $innoSetup $innoSetupScript ("/DSemVer=" + $semVer)
if ($LASTEXITCODE -ne 0) { Write-Host "Inno Setup 打包失败，终止。"; exit 1 }

$exe = Get-ChildItem "$PSScriptRoot\dist\*.exe" | Select-Object -First 1
if (-not $exe -or $exe.Length -lt 20MB) {
    Write-Host "安装包缺失或体积异常，终止。"; exit 1
}

Write-Host ("打包完成: " + $exe.FullName)
