using Common.Helpers;
using LiveWallpaper.LocalServer.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Utils
{
    /// <summary>
    /// 下载历史记账：持久化在本地服务端配置目录，刷新/重启后仍可见，
    /// 且所有UI源（线上站、本地页）读到的是同一份数据
    /// </summary>
    public static class DownloadRecordManager
    {
        static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();
        //与前端旧版localStorage的上限一致
        const int MaxRecords = 50;
        //进度回调与完成事件可能并发记账，串行化读写
        static readonly SemaphoreSlim _ioLock = new(1, 1);
        static List<DownloadRecord>? _records;

        public static string FilePath { get; } = Path.Combine(AppManager.ConfigDir, "Config", "downloadRecords.json");

        static async Task<List<DownloadRecord>> LoadAsync()
        {
            if (_records != null)
                return _records;

            List<DownloadRecord>? records = null;
            try
            {
                records = await JsonHelper.JsonDeserializeFromFileAsync<List<DownloadRecord>>(FilePath);
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }
            _records = records ?? new List<DownloadRecord>();
            return _records;
        }

        /// <summary>
        /// 记录一次下载结果，按Url去重（保留最新），超出上限淘汰最旧的
        /// </summary>
        public static async Task RecordAsync(DownloadRecord record)
        {
            await _ioLock.WaitAsync();
            try
            {
                if (string.IsNullOrEmpty(record.Url))
                    return;

                var records = await LoadAsync();
                records.RemoveAll(m => m.Url == record.Url);
                records.Add(record);
                if (records.Count > MaxRecords)
                {
                    records = records.OrderByDescending(m => m.Time).Take(MaxRecords).ToList();
                }
                _records = records;
                await SaveAsync(records);
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }
            finally
            {
                _ioLock.Release();
            }
        }

        /// <summary>
        /// 批量导入旧版浏览器localStorage迁移过来的记录，仅补缺不覆盖
        /// </summary>
        public static async Task ImportAsync(IEnumerable<DownloadRecord> records)
        {
            await _ioLock.WaitAsync();
            try
            {
                var existing = await LoadAsync();
                bool changed = false;
                foreach (var item in records)
                {
                    //失败的、被取消的也是有效历史，一并保留
                    if (item == null || string.IsNullOrEmpty(item.Url))
                        continue;
                    if (existing.Any(m => m.Url == item.Url))
                        continue;
                    existing.Add(item);
                    changed = true;
                }

                if (!changed)
                    return;

                if (existing.Count > MaxRecords)
                    existing = existing.OrderByDescending(m => m.Time).Take(MaxRecords).ToList();

                _records = existing;
                await SaveAsync(existing);
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }
            finally
            {
                _ioLock.Release();
            }
        }

        public static async Task<List<DownloadRecord>> GetAsync()
        {
            await _ioLock.WaitAsync();
            try
            {
                //最新的在前，前端直接按此顺序展示
                return (await LoadAsync()).OrderByDescending(m => m.Time).ToList();
            }
            finally
            {
                _ioLock.Release();
            }
        }

        public static async Task ClearAsync()
        {
            await _ioLock.WaitAsync();
            try
            {
                _records = new List<DownloadRecord>();
                if (File.Exists(FilePath))
                    File.Delete(FilePath);
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }
            finally
            {
                _ioLock.Release();
            }
        }

        static Task SaveAsync(List<DownloadRecord> records)
        {
            var dir = Path.GetDirectoryName(FilePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);
            return JsonHelper.JsonSerializeAsync(records, FilePath);
        }
    }
}
