:: build app-installer with one-click

@echo off

set /p buildfrontend=press y/n to build frontend project: 
if /i "%buildfrontend%"=="y" (
    :: build frontend
    cd ..\giantapp-wallpaper-ui
    call pnpm i
    call pnpm build:client
)

:: 返回build目录
cd /d %~dp0

set "sln=..\giantapp-wallpaper-client\Client\Client.csproj"
set "dist=%~dp0publish"
:: clean dist
if exist "%dist%" rmdir /s /q "%dist%"
:: publish sln    
powershell -NoProfile -Command "Import-Module '%~dp0Invoke-MsBuild\Invoke-MsBuild.psm1' -Force; Invoke-MsBuild -Path '%sln%' -MsBuildParameters '/t:Restore;Clean;Publish /p:PublishProfile=./FolderProfile.pubxml' -ShowBuildOutputInNewWindow -AutoLaunchBuildLogOnFailure"


:: inno setup 打包
set "innoSetup=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
set "innoSetupScript=%~dp0installer.iss"
set "innoSetupOutput=%~dp0dist"
if exist "%innoSetupOutput%" rmdir /s /q "%innoSetupOutput%"
"%innoSetup%" "%innoSetupScript%"

pause