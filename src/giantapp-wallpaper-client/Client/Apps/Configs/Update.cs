using System;
using System.Text.Json;

namespace Client.Apps.Configs;

public class Update
{
    public const string FullName = "Client.Apps.Configs.Update";

    //默认清单地址（发布脚本 publish.ts 的产品前缀）
    public const string DefaultUrl = "https://releases.giantapp.cc/wallpaper3";

    //更新服务器地址（清单 base）
    public string Url { get; set; } = DefaultUrl;

    //更新通道：stable / preview
    public string Channel { get; set; } = "stable";

    //已安装安装包的来源渠道，安装器启动时记录；空表示未知（旧版本升级而来）
    public string InstalledChannel { get; set; } = string.Empty;

    //检查并纠正
    public void Check()
    {
        if (string.IsNullOrWhiteSpace(Url))
            Url = DefaultUrl;
        if (Channel != "preview")
            Channel = "stable";
    }
}
