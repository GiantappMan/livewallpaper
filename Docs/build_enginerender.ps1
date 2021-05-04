# 依赖库：
# Install-Module -Name 7Zip4Powershell


$csproj = "..\LiveWallpaperEngineRender\LiveWallpaperEngineRender.csproj"
$publish_profile = "..\LiveWallpaperEngineRender\Properties\PublishProfiles\FolderProfile.pubxml"
$output_dir = ".\LiveWallpaperEngineRender"
$zip_file=".\LiveWallpaperEngineRender.7z"

dotnet publish $csproj  -p:PublishProfile=$publish_profile --output=$output_dir
Compress-7Zip -Path $output_dir -ArchiveFileName $zip_file
del $output_dir -recurse