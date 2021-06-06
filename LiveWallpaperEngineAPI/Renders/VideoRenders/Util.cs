using System;
using System.Windows.Forms;

namespace Giantapp.LiveWallpaper.Engine.VideoRenders
{
    class Util
    {
        internal static T ParseArguments<T>(string[] argsArray) where T : new()
        {
            T res = new();
            for (int i = 0; i < argsArray.Length; i++)
            {
                var item = argsArray[i];

                if (item.StartsWith("--"))
                {
                    string propertyName = item[2..];

                    var property = typeof(T).GetProperty(propertyName);
                    if (property != null && i < argsArray.Length - 1)
                    {
                        var valueStr = argsArray[i + 1];
                        object value = valueStr;

                        switch (property.PropertyType.FullName)
                        {
                            case "System.Int32": value = int.Parse(valueStr); break;
                        }

                        property.SetValue(res, value);
                    }
                }
            }
            return res;
        }
    }
}
