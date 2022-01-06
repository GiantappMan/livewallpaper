using Common.Helpers;
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Giantapp.LiveWallpaper.Engine
{
    public class SetupPlayerProgressChangedArgs : EventArgs
    {
        public enum Type
        {
            Downloading,
            Unpacking,
            Completed
        }
        public Type ActionType { get; set; }
        /// <summary>
        /// 当前动作完成
        /// </summary>
        public bool ActionCompleted { get; set; }

        /// <summary>
        /// 所有动作完成
        /// </summary>
        public bool AllCompleted { get; set; }
        public BaseApiResult Result { get; set; }
        public string Error { get; set; }
        public float ProgressPercentage { get; set; }
        public string Path { get; set; }
    }
    //包含所有的错误类型
    public enum ErrorType
    {
        None,
        NoPlayer,
        DownloadFailed,
        NoRender,
        Canceled,
        Uninitialized,
        Busy,
        Failed,
        Exception,
        NoFFmpeg,
        NoPermission
    }
    public class BaseApiResult<T> : BaseApiResult
    {
        public T Data { get; set; }
        public static new BaseApiResult<T> BusyState()
        {
            return ErrorState(ErrorType.Busy);
        }
        public static new BaseApiResult<T> ExceptionState(Exception ex)
        {
            return ErrorState(ErrorType.Exception, ex.Message);
        }
        public static BaseApiResult<T> ErrorState(ErrorType type, string msg = null, T data = default)
        {
            return new BaseApiResult<T>() { Ok = false, Error = type, Message = msg ?? type.ToString(), Data = data };
        }
        public static BaseApiResult<T> SuccessState(T data = default)
        {
            return new BaseApiResult<T>() { Ok = true, Data = data };
        }
    }
    public class BaseApiResult
    {
        public bool Ok { get; set; }
        public ErrorType Error { get; set; }
        public string ErrorString
        {
            get
            {
                string r = Error.ToString();
                return r;
            }
        }
        public string Message { get; set; }
        public static BaseApiResult BusyState()
        {
            return ErrorState(ErrorType.Busy);
        }
        public static BaseApiResult ExceptionState(Exception ex)
        {
            return ErrorState(ErrorType.Exception, ex.Message);
        }
        public static BaseApiResult ErrorState(ErrorType type, string msg = null)
        {
            return new BaseApiResult() { Ok = false, Error = type, Message = msg ?? type.ToString() };
        }
        public static BaseApiResult SuccessState()
        {
            return new BaseApiResult() { Ok = true };
        }
    }
    public class RenderProcess
    {
        public IntPtr HostHandle { get; set; }
        public IntPtr ReceiveMouseEventHandle { get; set; }
        public int PId { get; set; }
    }
    public class RenderInfo : RenderProcess
    {
        public RenderInfo()
        {

        }
        public RenderInfo(RenderProcess p)
        {
            HostHandle = p.HostHandle;
            ReceiveMouseEventHandle = p.ReceiveMouseEventHandle;
            PId = p.PId;
        }
        public WallpaperModel Wallpaper { get; set; }
        public string Screen { get; set; }
        public bool IsPaused { get; set; }
    }
    public enum WallpaperType
    {
        Video,
        Image,
        Web,
        Exe,
        Group
    }
    public class WallpaperOption
    {
        #region wallpaper

        /// <summary>
        /// 是否支持鼠标事件，exe和web才行。其他类型设置无效
        /// </summary>
        public bool EnableMouseEvent { get; set; } = true;

        #region video

        /// <summary>
        /// 是否启用硬件解码，video才行。其他类型无效
        /// </summary>
        public bool HardwareDecoding { get; set; } = true;

        /// <summary>
        /// 是否铺满
        /// </summary>
        public bool IsPanScan { get; set; } = true;

        /// <summary>
        /// 音量0-100
        /// </summary>
        public int Volume { get; set; }

        #endregion

        #endregion

        #region group

        public TimeSpan? SwitchingInterval
        {
            get
            {
                //默认10分钟间隔
                if (SwitchingIntervalString == null)
                    return new TimeSpan(0, 10, 0);

                _ = TimeSpan.TryParse(SwitchingIntervalString, out TimeSpan r);
                return r;
            }
        }

        public string SwitchingIntervalString { get; set; }
        /// <summary>
        /// 最后播放的壁纸索引
        /// </summary>
        public int? LastWallpaperIndex { get; set; }
        /// <summary>
        /// 壁纸切换时间
        /// </summary>
        public DateTime WallpaperChangeTime { get; set; }

        #endregion

        public static bool EqualExceptVolume(WallpaperOption lhs, WallpaperOption rhs)
        {
            if (lhs is null)
            {
                if (rhs is null)
                {
                    return true;
                }

                return false;
            }

            var r = lhs?.EnableMouseEvent == rhs?.EnableMouseEvent
                && lhs?.HardwareDecoding == rhs?.HardwareDecoding
                && lhs?.SwitchingIntervalString == rhs?.SwitchingIntervalString
                && lhs?.IsPanScan == rhs.IsPanScan;

            return r;
        }
    }
    public enum PausedReason
    {
        None,
        ScreenMaximized,
        SessionLock
    }
    public class WallpaperRunningData
    {
        /// <summary>
        /// 壁纸所在文件夹
        /// </summary>
        public string Dir { get; set; }
        public bool IsPaused { get; set; }
        public PausedReason PausedReason { get; set; }
        public bool IsStopedTemporary { get; set; }
        public string AbsolutePath { get; set; }
        private WallpaperType? _type;
        public string TypeString { get; private set; }
        public WallpaperType? Type
        {
            get => _type;
            set
            {
                _type = value;
                TypeString = value.ToString();
            }
        }
    }

    public class WallpaperInfoType
    {
        public static string Wallpaper { get; private set; } = "wallpaper";
        public static string Group { get; private set; } = "group";
    }

    public class WallpaperProjectInfo
    {
        public List<WallpaperProjectInfo> GroupItems { get; set; }
        public string ID { get; set; }
        public string LocalID { get; set; }
        public string Description { get; set; }
        public string Title { get; set; }
        public string File { get; set; }
        public string Preview { get; set; }
        /// <summary>
        /// group，分组
        /// null，壁纸
        /// </summary>
        public string Type { get; set; }
        public string Visibility { get; set; }
        public List<string> Tags { get; set; }
    }
    public class WallpaperModel : ICloneable
    {
        /// <summary>
        /// 壁纸可控参数
        /// </summary>
        public WallpaperOption Option { get; set; } = new WallpaperOption();
        /// <summary>
        /// 壁纸运行时产生的数据
        /// </summary>
        public WallpaperRunningData RunningData { get; set; } = new WallpaperRunningData();
        /// <summary>
        /// 壁纸信息，服务端保存也是这些
        /// </summary>
        public WallpaperProjectInfo Info { get; set; } = new WallpaperProjectInfo();

        public object Clone()
        {
            var json = JsonHelper.JsonSerialize(this);
            var res = JsonHelper.JsonDeserialize<WallpaperModel>(json);
            return res;
        }
    }
}
