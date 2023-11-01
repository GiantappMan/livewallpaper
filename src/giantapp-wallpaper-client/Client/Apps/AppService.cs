using Client.Apps.Configs;
using Client.Libs;
using GiantappWallpaper;
using Newtonsoft.Json;
using System.Reflection;

namespace Client.Apps;

/// <summary>
/// 每一个程序的特定业务逻辑，不通用代码
/// </summary>
internal class AppService
{
    public static readonly string ProductName = "LiveWallpaper3";

    private static readonly AutoStart autoStart;
    static AppService()
    {
        string exePath = Assembly.GetEntryAssembly()!.Location.Replace(".dll", ".exe");
        autoStart = new(ProductName, exePath);
    }

    #region public
    internal static void Init()
    {
        //前端api
        var api = new ApiObject();
        ApiObject.ConfigSetAfterEvent += Api_SetConfigEvent;
        ApiObject.CorrectConfigEvent += ApiObject_CorrectConfigEvent;
        ShellWindow.ClientApi = api;

        //常规设置
        var general = Configer.Get<General>() ?? new();
        bool tmp = autoStart.Check();
        if (tmp != general.AutoStart)
        {
            general.AutoStart = tmp;
            Configer.Set(general);
        }
        autoStart.Set(general.AutoStart);

        if (!general.HideWindow)
            ShellWindow.ShowShell();

        //外观配置
        var appearance = Configer.Get<Appearance>() ?? new();
        ApplyTheme(appearance);
    }

    internal static void ApplyTheme(Appearance? config)
    {
        if (config == null)
            return;
        ShellWindow.SetTheme(config.Theme, config.Mode);
    }
    #endregion

    #region callback
    private static void ApiObject_CorrectConfigEvent(object sender, CorrectConfigEventArgs e)
    {
        switch (e.Key)
        {
            case General.FullName:
                var config = JsonConvert.DeserializeObject<General>(e.Json);
                if (config != null)
                {
                    bool tmp = autoStart.Check();
                    config.AutoStart = tmp;//用真实情况修改返回值
                    e.Corrected = config;
                }
                break;
        }
    }

    private static void Api_SetConfigEvent(object sender, ConfigSetAfterEventArgs e)
    {
        switch (e.Key)
        {
            case Appearance.FullName:
                var configApperance = JsonConvert.DeserializeObject<Appearance>(e.Json);
                if (configApperance != null)
                {
                    ApplyTheme(configApperance);
                }
                break;
            case General.FullName:
                var configGeneral = JsonConvert.DeserializeObject<General>(e.Json);
                if (configGeneral != null)
                {
                    autoStart.Set(configGeneral.AutoStart);
                }
                break;
        }
    }
    #endregion
}
