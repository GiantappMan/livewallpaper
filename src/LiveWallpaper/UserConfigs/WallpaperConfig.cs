namespace LiveWallpaper.UserConfigs
{
    /// <summary>
    /// 视频播放器
    /// </summary>
    public enum VideoPlayer
    {
        Mpv,
        MediaPlayer
    }

    /// <summary>
    /// 壁纸行为
    /// </summary>
    public enum WallpaperBehavior
    {
        Pause,
        Play,
        Stop
    }

    /// <summary>
    /// 屏幕参数
    /// </summary>
    public class ScreenOption
    {
        /// <summary>
        /// 排序索引
        /// </summary>
        public uint SortIndex { get; set; }
        /// <summary>
        /// 屏幕索引
        /// </summary>
        public uint ScreenIndex { get; set; }
        /// <summary>
        /// 屏幕遮挡后的壁纸行为
        /// </summary>
        public WallpaperBehavior BehaviorWhenWindowMaximized { get; set; }
    }

    /// <summary>
    /// 壁纸相关设置
    /// </summary>
    public class WallpaperConfig
    {
        /// <summary>
        /// 壁纸保存目录
        /// </summary>
        public string? WallpaperDir { get; set; }

        /// <summary>
        /// 默认视频播放器
        /// </summary>
        public VideoPlayer DefaultVideoPlayer { get; set; }

        /// <summary>
        /// 壁纸音源来源哪块屏幕， 非屏幕值表示禁用
        /// </summary>
        public uint AudioScreen { get; set; }

        /// <summary>
        /// 屏幕最大化检查是否影响所有屏幕
        /// </summary>
        public bool AppMaximizedEffectAllScreen { get; set; }

        /// <summary>
        /// exe，web壁纸是否转发鼠标事件
        /// </summary>
        public bool ForwardMouseEvent { get; set; } = true;

        /// <summary>
        /// 屏幕参数
        /// </summary>
        public ScreenOption[] ScreenOptions { get; set; } = new ScreenOption[] { new ScreenOption() { } };
    }
}
