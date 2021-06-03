using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;

namespace Giantapp.LiveWallpaper.Engine.Renders
{
    /// <summary>
    /// 直接内置视频播放功能，以便于快速启动
    /// </summary>
    public class VideoRender : BaseRender
    {
        //每次升级就修改这个文件名
        public VideoRender() : base(WallpaperType.Video,
            new List<string>() {
                ".mp4", ".flv", ".blv", ".avi", ".mov", ".gif", ".webm" }
            , false)
        {

        }
    }
}
