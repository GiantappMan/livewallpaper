namespace LiveWallpaper.Configs
{
    /// <summary>
    /// 程序相关
    /// </summary>
    public class AppConfig
    {
        /// <summary>
        /// 开机启动
        /// </summary>
        public bool RunWhenStarts { get; set; } = true;

        /// <summary>
        /// 日志保存位置
        /// </summary>
        public string? LogDir { get; set; }

        /// <summary>
        /// 选中的多语言
        /// </summary>
        public string? CurrentLan { get; set; }
    }
}
