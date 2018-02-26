using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WallpaperTool.Helpers
{
    public class JsonHelper
    {
        public static Task<string> JsonSerializeAsync(Object obj, string outputSavePath = null)
        {
            return Task.Run(() =>
            {
                return JsonSerialize(obj, outputSavePath);
            });
        }

        /// <summary>
        /// JSON序列化
        /// </summary>
        public static string JsonSerialize(Object obj, string outputSavePath = null)
        {
            try
            {
                var json = JsonConvert.SerializeObject(obj, Formatting.None);

                if (!string.IsNullOrEmpty(outputSavePath))
                {
                    var configDir = Path.GetDirectoryName(outputSavePath);
                    if (!Directory.Exists(configDir))
                        Directory.CreateDirectory(configDir);
                    File.WriteAllText(outputSavePath, json);
                }

                return json;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return null;
            }
        }

        public static Task<T> JsonDeserializeAsync<T>(string jsonString)
        {
            return Task.Run(() =>
            {
                return JsonDeserialize<T>(jsonString);
            });
        }

        public static Task<T> JsonDeserializeFromFileAsync<T>(string path)
        {
            return Task.Run(() =>
            {
                string json = File.ReadAllText(path);
                return JsonDeserialize<T>(json);
            });
        }

        /// <summary>
        /// JSON反序列化
        /// </summary>
        public static T JsonDeserialize<T>(string jsonString)
        {
            try
            {
                if (string.IsNullOrEmpty(jsonString))
                    return default(T);
                T result = JsonConvert.DeserializeObject<T>(jsonString);
                return result;
            }
            catch (Exception)
            {
                return default(T);
            }
        }

        public static bool PublicInstancePropertiesEqual<T>(T self, T to, params string[] ignore) where T : class
        {
            if (self != null && to != null)
            {
                Type type = typeof(T);
                List<string> ignoreList = new List<string>(ignore);
                foreach (System.Reflection.PropertyInfo pi in type.GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance))
                {
                    if (!ignoreList.Contains(pi.Name))
                    {
                        object selfValue = type.GetProperty(pi.Name).GetValue(self, null);
                        object toValue = type.GetProperty(pi.Name).GetValue(to, null);

                        if (selfValue != toValue && (selfValue == null || !selfValue.Equals(toValue)))
                        {
                            return false;
                        }
                    }
                }
                return true;
            }
            return self == to;
        }
    }
}
