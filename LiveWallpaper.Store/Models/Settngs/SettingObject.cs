using System;
using System.Threading.Tasks;

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
                Server = ServerSetting.GetDefault(),
                General = GeneralSetting.GetDefault()
            };
            return result;
        }

        //检查是否有配置需要重新生成
        public void CheckDefaultSetting()
        {
            if (Server == null)
            {
                //默认值
                Server = ServerSetting.GetDefault();
            }
            if (General == null)
                General = GeneralSetting.GetDefault();
        }
    }
}
