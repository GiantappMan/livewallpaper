using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

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
        internal static void InvokeIfRequired(Action a)
        {
            if (Application.OpenForms.Count == 0)
                return;

            var mainForm = Application.OpenForms[0];
            if (mainForm.InvokeRequired)
                mainForm.Invoke(a);
            else
                a();
        }
    }
}
