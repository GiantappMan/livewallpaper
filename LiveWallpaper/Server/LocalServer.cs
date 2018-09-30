using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Server
{
    public class LocalServer : IServer
    {
        string _host;

        public async Task<ObservableCollection<TagServerObj>> GetTags()
        {
            var result = await HttpGet<ObservableCollection<TagServerObj>>($"{_host}/tags");
            return result;
        }

        public Task InitlizeServer(string url)
        {
            _host = url;
            return Task.CompletedTask;
        }

        private JsonSerializerSettings jsonSerializerSettings = new JsonSerializerSettings() { MissingMemberHandling = MissingMemberHandling.Ignore, NullValueHandling = NullValueHandling.Ignore };
        private async Task<T> HttpGet<T>(string url)
        {
            try
            {
                var handle = new HttpClientHandler
                {
                    AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
                };
                using (var httpClient = new HttpClient(handle))
                {

                    HttpResponseMessage response = await httpClient.GetAsync(url);
                    if (!response.IsSuccessStatusCode)
                        return default(T);

                    var json = await response.Content.ReadAsStringAsync();

                    T result = default(T);
                    try
                    {
                        result = JsonConvert.DeserializeObject<T>(json, jsonSerializerSettings);
                    }
                    catch (JsonReaderException ex)
                    {
                        System.Diagnostics.Debug.WriteLine(ex);
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine(ex);
                    }
                    return result;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex.ToString());
                return default(T);
            }
        }

    }
}
