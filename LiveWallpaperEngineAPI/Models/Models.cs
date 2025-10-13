using System;
using System.Collections.Generic;
using System.Text.Json;
using WinAPI.Desktop.API;

namespace Giantapp.LiveWallpaper.Engine.Models
{

    public enum PlayMode
    {
        //顺序播放
        Order,
        //随机播放
        Random,
        //定时切换
        Timer
    }
    //一个壁纸的设置
    public class WallpaperSetting : ICloneable
    {
        /// <summary>
        /// 播放时长，没设就用默认值，图片默认一小时
        /// 除了playlist，都显示这个值
        /// </summary>
        public string? Duration { get; set; }

        #region exe
        /// <summary>
        /// 是否支持鼠标事件，exe和web才行。其他类型设置无效
        /// </summary>
        public bool EnableMouseEvent { get; set; } = false;
        #endregion

        #region video

        /// <summary>
        /// 是否启用硬件解码，video才行。其他类型无效
        /// </summary>
        public bool HardwareDecoding { get; set; } = true;

        /// <summary>
        /// 是否铺满
        /// </summary>
        public bool IsPanScan { get; set; } = true;

        ///// <summary>
        ///// 音量0-100
        ///// </summary>
        //public int Volume { get; set; } = 0;

        ////界面不做展示，仅当VideoPlayer为默认时，读取数据并保存
        //public VideoPlayer DefaultVideoPlayer { get; set; } = VideoPlayer.MPV_Player;

        #endregion

        #region web

        #endregion

        #region img

        public DesktopWallpaperPosition Fit { get; set; } = DesktopWallpaperPosition.DWPOS_FILL;

        //退出程序后，保留壁纸
        public bool KeepWallpaper { get; set; } = true;

        #endregion

        #region playlist
        public PlayMode PlayMode { get; set; } = PlayMode.Order;
        #endregion

        public static WallpaperSetting From(Dictionary<string, object> dic)
        {
            //根据反射，自动把字典转换为对象
            var setting = new WallpaperSetting();
            var type = setting.GetType();
            foreach (var item in dic)
            {
                var property = type.GetProperty(item.Key);
                if (property != null)
                {
                    var value = item.Value;
                    property.SetValue(setting, value);
                }
            }
            return setting;
        }

        public object Clone()
        {
            return CloneObject(this)!;
        }

        public static object? CloneObject(object obj)
        {
            if (obj == null)
                return null;

            //用json序列化clone，反射有时候要崩
            return JsonSerializer.Deserialize(JsonSerializer.Serialize(obj), obj.GetType());
        }
    }
}
