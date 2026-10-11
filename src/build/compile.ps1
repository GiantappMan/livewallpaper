# build app-installer with one-click

function DeletePath([String]$path) {
    if (Test-Path $path) {
        Remove-Item -path $path -Recurse
        Write-Host ("delete path {0}..." -f $path)
    }
}

Write-Host "press y/n to build frondend project"
$key = $Host.UI.RawUI.ReadKey()
 
if ($key.Character -eq 'y') {
    # build frontend
    Set-Location ../giantapp-wallpaper-ui
    pnpm i
    pnpm build:client
}

#返回build目录
Set-Location ../build

# mpv 播放器缺失时自动下载（目录被 gitignore，新环境必缺；失败则终止打包）
& "$PSScriptRoot\download-mpv.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "mpv 下载失败，安装包将缺少视频播放器（mpv），终止打包。"
    exit 1
}

Import-Module -Name "$PSScriptRoot\Invoke-MsBuild\Invoke-MsBuild.psm1" -Force

$sln = "..\giantapp-wallpaper-client\Client\Client.csproj"
$buildDist = "$PSScriptRoot\publish"
# clean dist
DeletePath -path $buildDist
# build sln
# Invoke-MsBuild -Path $sln -MsBuildParameters "-t:restore /target:Clean;Build /property:Configuration=Release;OutputPath=$buildDist" -ShowBuildOutputInNewWindow -PromptForInputBeforeClosing -AutoLaunchBuildLogOnFailure
Invoke-MsBuild -Path $sln -MsBuildParameters "-t:restore /target:Clean;Publish /p:PublishProfile=./FolderProfile.pubxml" -ShowBuildOutputInNewWindow -PromptForInputBeforeClosing -AutoLaunchBuildLogOnFailure

# inno setup 打包
$innoSetup = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
$innoSetupScript = "$PSScriptRoot\installer.iss"
$innoSetupOutput = "$PSScriptRoot\dist"
DeletePath -path $innoSetupOutput
& $innoSetup $innoSetupScript

