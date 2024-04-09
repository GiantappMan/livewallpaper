using System;
using System.Linq;
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
    public string CurrentLan { get; set; } = Thread.CurrentThread.CurrentCulture.TwoLetterISOLanguageName;

    //检查纠正CurrentLan
    public void CheckLan()
    {
        //可用语言
        var lans = new[] { "zh", "en", "ru" };
        //如果不包含，默认英文
        if (!lans.Contains(CurrentLan))
        {
            CurrentLan = "en";
        }
    }


    public object Clone()
    {
        return MemberwiseClone();
    }
}
