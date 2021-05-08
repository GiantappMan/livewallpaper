using Common.Helpers;
using System;
using System.Collections.Generic;

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
        Exe
    }
    public class WallpaperOption : IEquatable<WallpaperOption>
    {
        /// <summary>
        /// 是否支持鼠标事件，exe和web才行。其他类型设置无效
        /// </summary>
        public bool EnableMouseEvent { get; set; } = true;

        /// <summary>
        /// 是否启用硬件解码，video才行。其他类型无效
        /// </summary>
        public bool HardwareDecoding { get; set; } = true;

        public static bool operator ==(WallpaperOption lhs, WallpaperOption rhs)
        {
            if (lhs is null)
            {
                if (rhs is null)
                {
                    return true;
                }

                return false;
            }

            var r = lhs.EnableMouseEvent == rhs.EnableMouseEvent
                && lhs.HardwareDecoding == rhs.HardwareDecoding;

            return r;
        }

        public static bool operator !=(WallpaperOption lhs, WallpaperOption rhs)
        {
            return !(lhs == rhs);
        }

        public override bool Equals(object obj)
        {
            return Equals(obj as WallpaperOption);
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(EnableMouseEvent, HardwareDecoding);
        }

        public bool Equals(WallpaperOption p)
        {
            // If parameter is null, return false.
            if (p is null)
            {
                return false;
            }

            // Optimization for a common success case.
            if (ReferenceEquals(this, p))
            {
                return true;
            }

            // If run-time types are not exactly the same, return false.
            if (GetType() != p.GetType())
            {
                return false;
            }
            var r = EnableMouseEvent == p.EnableMouseEvent
                          && HardwareDecoding == p.HardwareDecoding;

            return r;
        }
    }
    public class WallpaperRunningData
    {
        /// <summary>
        /// 壁纸所在文件夹
        /// </summary>
        public string Dir { get; set; }
        public bool IsPaused { get; set; }
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
    public class WallpaperProjectInfo
    {
        public string ID { get; set; }
        public string LocalID { get; set; }
        public string Description { get; set; }
        public string Title { get; set; }
        public string File { get; set; }
        public string Preview { get; set; }
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
