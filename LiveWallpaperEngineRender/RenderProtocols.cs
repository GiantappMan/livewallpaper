using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace LiveWallpaperEngineRender
{
    public enum ProtocolDefinition
    {
        //to render
        PlayVideo,
        StopVideo,
        PauseVideo,
        ResumVideo,
        SetAudio,
        //to parent
        Initlized
    }

    public class RenderProtocol
    {
        private object _payload;

        public RenderProtocol()
        {

        }

        public RenderProtocol(object obj)
        {
            SetPayLoad(obj);
        }

        public ProtocolDefinition Command { get; set; }
        public string PayloadJson { get; set; }
        public void SetPayLoad<T>(T obj) where T : class
        {
            PayloadJson = JsonSerializer.Serialize(obj);
            _payload = obj;
        }

        public T GetPayLoad<T>() where T : class
        {
            if (_payload == null && !string.IsNullOrEmpty(PayloadJson))
            {
                _payload = JsonSerializer.Deserialize<T>(PayloadJson);
            }
            return _payload as T;
        }
    }

    public class InitlizedPayload
    {
        public Dictionary<string, Int64> WindowHandles { get; set; } = new Dictionary<string, Int64>();
    }

    public class ScreenInfo
    {
        public ScreenInfo(string screenName, bool panscan)
        {
            ScreenName = screenName;
            Panscan = panscan;
        }
        public string ScreenName { get; set; }
        public bool Panscan { get; set; }
    }

    public class PlayVideoPayload
    {
        public string FilePath { get; set; }
        public bool HardwareDecoding { get; set; } = true;
        public ScreenInfo[] Screen { get; set; }
        /// <summary>
        /// 播放屏幕声音，只能播放一个，null都不播放
        /// </summary>
        public string AudioScreen { get; set; }
    }
    public class SetAudioPayload
    {
        public string AudioScreen { get; set; }
        /// <summary>
        /// 音量 0-100
        /// </summary>
        public int Volume { get; set; }
    }

    public class StopVideoPayload
    {
        public string[] Screen { get; set; }
    }

    public class PauseVideoPayload
    {
        public string[] Screen { get; set; }
    }

    public class ResumeVideoPayload
    {
        public string[] Screen { get; set; }
    }
}
