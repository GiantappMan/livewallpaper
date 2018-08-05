#define AppEnName "LiveWallpaper-Free"
#define OutputPath="..\bin"
#define ProcessName="LiveWallpaper-Free"
#define AppVersion=GetFileVersion("..\bin\LiveWallpaper-Free.exe")

[Setup]
AppName={cm:AppName}                                
AppId={#AppEnName}
AppVerName={cm:AppName} v{#AppVersion}
DefaultDirName={pf}\{#AppEnName}
DefaultGroupName={cm:AppName}
CloseApplications=force
UninstallDisplayIcon={app}\{#ProcessName}.exe
VersionInfoDescription={cm:Description}
VersionInfoProductName={cm:AppName}
OutputDir={#SourcePath}
OutputBaseFilename={#AppEnName}Setup_{#AppVersion}

[Languages]
Name: en; MessagesFile: "compiler:Default.isl"
Name: chs; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Messages]
en.BeveledLabel=English
chs.BeveledLabel=中文

[CustomMessages]
en.Description=LiveWallpaer Free
en.AppName={#AppEnName}
en.LaunchApp="Launch application"
chs.Description=免费开源的动态壁纸
chs.AppName=眼睛护士
chs.LaunchApp=启动程序

[Code]
procedure TaskKill();
var
  ResultCode: Integer;
begin
    Exec(ExpandConstant('taskkill.exe'), '/f /im ' + '"' + '{#ProcessName}.exe' + '"', '', SW_HIDE,
     ewWaitUntilTerminated, ResultCode);
end;

[Files]
Source:{#OutputPath}*.exe;DestDir: "{app}" ;Flags: ignoreversion; BeforeInstall: TaskKill()
Source:{#OutputPath}*.dll;DestDir: "{app}"
Source:{#OutputPath}Resources\* ;DestDir: "{app}\Resources"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\{cm:AppName}"; Filename: "{app}\EyeNurse.exe"
Name: "{group}\{cm:UninstallProgram,{cm:AppName}}"; Filename: "{uninstallexe}"

[Tasks]
; The following task doesn't do anything and is only meant to show [CustomMessages] usage
; Name: mytask; Description: "{cm:Description}"

[Run]
Filename: "{app}\EyeNurse.EXE"; Description: {cm:LaunchApp}; Flags: nowait postinstall skipifsilent 

[UninstallRun]
Filename: "{cmd}"; Parameters: "/C ""taskkill /im {#ProcessName}.exe /f /t"
