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

    public class PlayVideoPayload
    {
        public string FilePath { get; set; }
        public string[] Screen { get; set; }
    }

    public class StopVideoPayload
    {
        public string[] Screen { get; set; }
    }
}
