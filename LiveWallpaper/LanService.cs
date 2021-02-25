using LiveWallpaper.LocalServer;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper
{
    public class LanService : ILanService
    {
        private string _culture;
        public string Culture { get { return _culture; } }

        public event EventHandler CultureChanged;

        public string GetText(string key)
        {
            return key;
        }

        public void SetCulture(string culture)
        {
            if (_culture == culture)
                return;

            _culture = culture;
            CultureChanged?.Invoke(this, new EventArgs());
        }
    }
}
