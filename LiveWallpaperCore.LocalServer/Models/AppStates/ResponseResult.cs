using System;
using System.Collections.Generic;
using System.Text;

namespace LiveWallpaperCore.LocalServer.Models.AppStates
{
    public class ResponseResult
    {
        public ResponseResult(bool ok, string msg)
        {
            IsOk = ok;
            Message = msg;
        }

        public bool IsOk { get; set; }
        public string Message { get; set; }
    }
}
