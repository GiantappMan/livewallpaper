using System;

namespace LiveWallpaper.Store.Models.Settngs
{
    public class SettingObject
    {
        public GeneralSetting General { get; set; } = new GeneralSetting();
        public ServerSetting Server { get; set; } = new ServerSetting();

        internal static SettingObject GetDefaultSetting()
        {
            var result = new SettingObject
            {
                Server = new ServerSetting
                {
                    ServerUrl = "http://localhost:8080:"
                },
                General = new GeneralSetting()
            };
            return result;
        }
    }
}
