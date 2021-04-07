using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace Giantapp.LiveWallpaper.Engine.Renders
{
    /// <summary>
    /// 呈现一种类型的壁纸
    /// </summary>
    public interface IRender
    {
        WallpaperType SupportType { get; }

        List<string> SupportExtension { get; }
        /// <summary>
        /// 释放
        /// </summary>
        void Dispose();
        /// <summary>
        /// 加载壁纸，内部处理重复开壁纸问题
        /// </summary>
        /// <param name="path"></param>
        Task<BaseApiResult<List<RenderInfo>>> ShowWallpaper(WallpaperModel wallpaper, params string[] screen);
        void Pause(params string[] screens);
        void Resume(params string[] screens);
        void SetVolume(int v, string screen);
        int GetVolume(string screen);
        Task CloseWallpaperAsync(params string[] screens);
    }
}
