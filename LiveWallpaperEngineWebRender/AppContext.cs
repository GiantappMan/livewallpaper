using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace LiveWallpaperEngineWebRender
{
    public class AppContext : ApplicationContext
    {

        public AppContext()
        {
        }

        public AppContext(string[] args)
        {
            var position = Resolve(args, "--position=")?.Split(",");
            if (position == null)
                position = new string[] { "0", "0" };
            var urls = args.Where(m => !m.StartsWith("--")).ToArray();
   
            foreach (var item in urls)
            {
                BrowserForm f = new BrowserForm(item, int.Parse(position[0]), int.Parse(position[1]));
                f.Show();
            }
        }

        private static string Resolve(string[] args, string v)
        {
            foreach (var item in args)
            {
                if (item.StartsWith(v))
                    return item.Replace(v, "");
            }

            return null;
        }
    }
}
