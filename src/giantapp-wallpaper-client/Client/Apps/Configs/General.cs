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
    public string CurrentLan { get; set; } = GetDefaultLan();

    //系统语言 → 支持的语言（与前端 i18n-config.ts 保持一致）
    private static string GetDefaultLan()
    {
        var culture = Thread.CurrentThread.CurrentCulture;
        var name = culture.Name.ToUpperInvariant();
        //繁体地区（台湾/香港/澳门）默认繁体中文
        if (name.StartsWith("ZH-TW") || name.StartsWith("ZH-HK") || name.StartsWith("ZH-MO") || name.StartsWith("ZH-HANT"))
            return "zh-Hant";
        //其他中文 → 简体；葡语（巴西）→ pt-BR；其余取两位语言码
        if (culture.TwoLetterISOLanguageName == "zh")
            return "zh";
        if (culture.TwoLetterISOLanguageName == "pt")
            return "pt-BR";
        return culture.TwoLetterISOLanguageName;
    }

    //检查纠正CurrentLan
    public void CheckLan()
    {
        //可用语言
        var lans = new[] { "zh", "zh-Hant", "en", "es", "ar", "hi", "pt-BR", "fr", "ja", "de", "ru" };
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
