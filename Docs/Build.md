---
LiveWallpaper
#　打包成单个文件
https://github.com/dotnet/runtime/issues/36590

```
dotnet publish -r win-x64 /p:PublishSingleFile=true /p:IncludeNativeLibrariesInSingleFile=true
```

# changeslog生成
# 需要安装 github_changelog_generator 
```
github_changelog_generator -u giant-app -p livewallpaper
```  
---

LiveWallpaperEngine
## 打包命令
```
dotnet pack LiveWallpaperEngineAPI -o ../LocalNuget/Packages --configuration release
```
## 生成license
```
thirdlicense.exe --project=LiveWallpaperEngineAPI/LiveWallpaperEngineAPI.csproj --output=Thirdparty-LiveWallpaperEngineAPI.TXT
thirdlicense.exe --project=LiveWallpaperEngineWebRender/LiveWallpaperEngineWebRender.csproj --output=Thirdparty-LiveWallpaperEngineWebRender.TXT
```
## 打包LiveWallpaperEngineWebRender
- 执行 build.ps1

---