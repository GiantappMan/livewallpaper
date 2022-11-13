using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace GiantappUI.Helpers
{
    public class JsonHelper
    {
        /// <summary>
        /// JSON序列化
        /// </summary>
        public static string? JsonSerialize(object obj, string? outputSavePath = null)
        {
            try
            {
                var json = JsonSerializer.Serialize(obj, obj.GetType());

                if (!string.IsNullOrEmpty(outputSavePath))
                {
                    var configDir = Path.GetDirectoryName(outputSavePath);
                    if (configDir != null && !Directory.Exists(configDir))
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

        public static T? JsonDeserializeFromFile<T>(string path)
        {
            if (!File.Exists(path))
                return default;
            string json = File.ReadAllText(path);
            return JsonDeserialize<T>(json);
        }

        /// <summary>
        /// JSON反序列化
        /// </summary>
        public static T? JsonDeserialize<T>(string jsonString)
        {
            try
            {
                if (string.IsNullOrEmpty(jsonString))
                    return default;
                T? result = JsonSerializer.Deserialize<T>(jsonString);
                return result;
            }
            catch (Exception)
            {
                return default;
            }
        }

        public static bool PublicInstancePropertiesEqual<T>(T self, T to, params string[] ignore) where T : class
        {
            if (self != null && to != null)
            {
                Type? type = typeof(T);
                List<string> ignoreList = new(ignore);
                foreach (System.Reflection.PropertyInfo pi in type.GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance))
                {
                    if (!ignoreList.Contains(pi.Name))
                    {
                        object? selfValue = type?.GetProperty(pi.Name)?.GetValue(self, null);
                        object? toValue = type?.GetProperty(pi.Name)?.GetValue(to, null);

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
