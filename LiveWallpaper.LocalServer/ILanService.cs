using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer
{
    public interface ILanService
    {
        event EventHandler CultureChanged;
        public string Culture { get; }
        void SetCulture(string culture);
        string GetText(string key);
    }
}
