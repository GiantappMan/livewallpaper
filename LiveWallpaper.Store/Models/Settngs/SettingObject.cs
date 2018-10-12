using System;

namespace LiveWallpaper.Store.Models.Settngs
{
    public class SettingObject
    {
        public ServerSetting Server { get; set; }

        internal static SettingObject GetDefaultSetting()
        {
            var result = new SettingObject
            {
                Server = new ServerSetting
                {
                    ServerUrl = "http://localhost:8080:"
                }
            };
            return result;
        }
    }
}
