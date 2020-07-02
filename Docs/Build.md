#　打包成单个文件
https://github.com/dotnet/runtime/issues/36590

```
dotnet publish -r win-x64 /p:PublishSingleFile=true /p:IncludeNativeLibrariesInSingleFile=true
```
