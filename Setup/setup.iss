#define AppEnName "LiveWallpaper-Free"
#define AppDescription="LiveWallpaer Free"
#define OutputPath="..\bin\"
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
VersionInfoDescription={#AppDescription}
VersionInfoProductName={#AppEnName}
VersionInfoVersion={#AppVersion}
OutputDir={#SourcePath}
OutputBaseFilename={#AppEnName}Setup_{#AppVersion}

[Languages]
Name: en; MessagesFile: "compiler:Default.isl"
Name: chs; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Messages]
en.BeveledLabel=English
chs.BeveledLabel=中文

[CustomMessages]
en.AppName={#AppEnName}
en.LaunchApp="Launch application"
chs.AppName={#AppEnName}
chs.LaunchApp=启动程序

[Code]
procedure TaskKill(FileName: String);
var
  ResultCode: Integer;
begin
    Exec(ExpandConstant('taskkill.exe'), '/f /im ' + '"' + FileName + '"', '', SW_HIDE,
     ewWaitUntilTerminated, ResultCode);
end;

[Files]
Source:{#OutputPath}*.exe;DestDir: "{app}" ;Flags: ignoreversion; BeforeInstall: TaskKill('{#ProcessName}.exe')
Source:{#OutputPath}*.dll;DestDir: "{app}"
Source:{#OutputPath}Browser\* ;DestDir: "{app}\Browser"; Flags: ignoreversion recursesubdirs
Source:{#OutputPath}Languages\* ;DestDir: "{app}\Languages"; Flags: ignoreversion recursesubdirs
Source:{#OutputPath}VideoPlayer\* ;DestDir: "{app}\VideoPlayer"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\{cm:AppName}"; Filename: "{app}\{#AppEnName}.exe"
Name: "{group}\{cm:UninstallProgram,{cm:AppName}}"; Filename: "{uninstallexe}"

[Tasks]
; The following task doesn't do anything and is only meant to show [CustomMessages] usage
; Name: mytask; Description: "{cm:Description}"

[Run]
Filename: "{app}\{#AppEnName}.EXE"; Description: {cm:LaunchApp}; Flags: nowait postinstall skipifsilent 

[UninstallRun]
Filename: "{cmd}"; Parameters: "/C ""taskkill /im {#ProcessName}.exe /f /t"
