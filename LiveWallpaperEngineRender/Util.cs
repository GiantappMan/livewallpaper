using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaperEngineRender
{
    class Util
    {

        internal static T ParseArguments<T>(string[] argsArray) where T : new()
        {
            T res = new T();
            for (int i = 0; i < argsArray.Length; i++)
            {
                var item = argsArray[i];

                if (item.StartsWith("--"))
                {
                    string propertyName = item.Substring(2);

                    var property = typeof(T).GetProperty(propertyName);
                    if (property != null && i < argsArray.Length - 1)
                    {
                        property.SetValue(res, argsArray[i + 1]);
                    }
                }
            }
            return res;
        }
    }
}
