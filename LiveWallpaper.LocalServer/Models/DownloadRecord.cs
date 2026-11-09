using System;

namespace LiveWallpaper.LocalServer.Models
{
    /// <summary>
    /// 下载历史记录。记账在本地服务端，线上站/本地页等多个UI源读取同一份数据，
    /// 避免浏览器localStorage按源隔离导致各页面历史不一致
    /// </summary>
    public class DownloadRecord
    {
        /// <summary>
        /// 壁纸主文件URL，唯一键
        /// </summary>
        public string? Url { get; set; }
        public string? Title { get; set; }
        public bool Succeeded { get; set; }
        /// <summary>
        /// 用户主动取消
        /// </summary>
        public bool Cancelled { get; set; }
        /// <summary>
        /// 失败原因
        /// </summary>
        public string? Error { get; set; }
        /// <summary>
        /// 完成时间，用于去重时保留最新与淘汰最旧
        /// </summary>
        public DateTime Time { get; set; }
    }
}
