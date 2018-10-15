using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Store.Models.Settngs
{
    public class ServerSetting
    {
        public string ServerUrl { get; set; }        
        public static ServerSetting GetDefault()
        {
            return new ServerSetting()
            {
                ServerUrl = "http://localhost:8080"
            };
        }
    }
}
