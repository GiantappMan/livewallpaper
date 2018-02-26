using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WallpaperTool.Wallpapers
{
    public class WallpapaerParameter
    {
        public string Dir { get; set; }
        public string EnterPoint { get; set; }
        public string Args { get; set; }

        public override bool Equals(Object obj)
        {
            //Check for null and compare run-time types.
            if ((obj == null) || !this.GetType().Equals(obj.GetType()))
            {
                return false;
            }
            else
            {
                WallpapaerParameter p = (WallpapaerParameter)obj;
                return (Dir == p.Dir) && (Args == p.Args) && (EnterPoint == p.EnterPoint);
            }
        }

        public override int GetHashCode()
        {
            return base.GetHashCode();
        }
    }
}
