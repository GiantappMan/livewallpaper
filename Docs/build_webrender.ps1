# 依赖库：
# Install-Module -Name 7Zip4Powershell


$csproj = "..\LiveWallpaperEngineWebRender\LiveWallpaperEngineWebRender.csproj"
$publish_profile = "..\LiveWallpaperEngineWebRender\Properties\PublishProfiles\FolderProfile.pubxml"
$output_dir = ".\web"
$zip_file=".\web.7z"

dotnet publish $csproj  -p:PublishProfile=$publish_profile --output=$output_dir
Compress-7Zip -Path $output_dir -ArchiveFileName $zip_file
del $output_dir -recurse