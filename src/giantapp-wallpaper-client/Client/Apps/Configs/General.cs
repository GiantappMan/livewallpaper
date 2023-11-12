using System;
using System.Threading;

namespace Client.Apps.Configs;

public class General : ICloneable
{
    public const string FullName = "Client.Apps.Configs.General";

    //开机启动
    public bool AutoStart { get; set; }

    //启动后不打开窗口
    public bool HideWindow { get; set; }

    //当前选中语言
    public string CurrentLan { get; set; } = Thread.CurrentThread.CurrentCulture.Name;

    public object Clone()
    {
        return MemberwiseClone();
    }
}
