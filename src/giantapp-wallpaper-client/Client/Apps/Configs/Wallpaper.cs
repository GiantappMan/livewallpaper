namespace Client.Apps.Configs;

//壁纸设置
public class Wallpaper
{
    public const string FullName = "Client.Apps.Configs.Wallpaper";
    //壁纸目录，支持多个
    public string[] Directories { get; set; } = new string[0];
}
