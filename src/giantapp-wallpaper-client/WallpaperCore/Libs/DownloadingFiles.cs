using System;
using System.Collections.Concurrent;
using System.IO;

namespace WallpaperCore.Libs;

/// <summary>
/// 正在下载中的壁纸文件登记表（DownloadService 下载开始/结束时登记注销）。
/// 壁纸枚举据此跳过半成品文件：残缺文件没有封面会触发 mpv 截图，
/// 且 mpv 处理残缺文件时可能长时间不退出（曾导致列表无限 loading）
/// </summary>
public static class DownloadingFiles
{
    static readonly ConcurrentDictionary<string, byte> _paths = new();

    //windows 路径大小写/分隔符不敏感，统一成完整路径小写再比较
    static string Normalize(string path) => Path.GetFullPath(path).ToLowerInvariant();

    public static void Begin(string path) => _paths.TryAdd(Normalize(path), 0);

    public static void End(string path) => _paths.TryRemove(Normalize(path), out _);

    public static bool Contains(string path) => _paths.ContainsKey(Normalize(path));
}
