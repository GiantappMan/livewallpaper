using Common.Helpers;
using LiveWallpaper.LocalServer;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;

namespace LiveWallpaper
{
    public class LanService
    {
        private Dictionary<string, dynamic> dataDict = new Dictionary<string, dynamic>();


        public Task<string> GetTextAsync(string key, string culture)
        {
            return Task.Run(() =>
            {
                return GetText(key, culture);
            });
        }
        public string GetText(string key, string culture)
        {
            if (!dataDict.ContainsKey(culture))
            {
                //怀疑用Environment.CurrentDirectory开机启动时目录会出错，待验证
                string appDir = Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);
                string lanDir = Path.Combine(appDir, "Assets\\livewallpaper_i18n");

                var files = Directory.GetFiles(lanDir, $"{culture}.json");
                //找不到匹配的，找近似的。例如 zh-CHS找不到,zh也可以
                if (files.Length == 0)
                {
                    bool isSubLan = culture.Split('-').Length > 1;
                    if (isSubLan)
                        files = Directory.GetFiles(lanDir, $"{culture.Split('-')[0]}*");
                }

                //找不到匹配语言，使用英文作为默认
                if (files.Length == 0)
                {
                    culture = "en";
                    files = Directory.GetFiles(lanDir, "en*");
                }

                string json = File.ReadAllText(files[0]);
                if (string.IsNullOrEmpty(json))
                    return null;

                var data = JObject.Parse(json);

                if (!dataDict.ContainsKey(culture))
                    dataDict.Add(culture, data);
            }

            var tmp = key.Split(".");
            JToken cultureObj = dataDict[culture];
            foreach (var item in tmp)
            {
                cultureObj = cultureObj[item];
            }

            string result = cultureObj.Value<string>();
            return result;
        }
    }
}
