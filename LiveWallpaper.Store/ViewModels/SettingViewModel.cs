using Caliburn.Micro;
using DZY.DotNetUtil.Helpers;
using JsonConfiger;
using JsonConfiger.Models;
using LiveWallpaper.Store.Helpers;
using LiveWallpaper.Store.Models.Settngs;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Storage;

namespace LiveWallpaper.Store.ViewModels
{
    public class SettingViewModel : Screen
    {
        JCrService _jcrService = new JCrService();

        public SettingViewModel()
        {
        }

        #region override

        protected override async void OnInitialize()
        {
            await LoadConfig();
            base.OnInitialize();
        }

        #endregion

        protected override void OnDeactivate(bool close)
        {
            SaveConfig();
            base.OnDeactivate(close);
        }

        #region properties

        #region JsonConfierViewModel

        /// <summary>
        /// The <see cref="JsonConfierViewModel" /> property's name.
        /// </summary>
        public const string JsonConfierViewModelPropertyName = "JsonConfierViewModel";

        private JsonConfierViewModel _JsonConfierViewModel;

        /// <summary>
        /// JsonConfierViewModel
        /// </summary>
        public JsonConfierViewModel JsonConfierViewModel
        {
            get { return _JsonConfierViewModel; }

            set
            {
                if (_JsonConfierViewModel == value) return;

                _JsonConfierViewModel = value;
                NotifyOfPropertyChange(JsonConfierViewModelPropertyName);
            }
        }

        #endregion

        #endregion

        private async Task LoadConfig()
        {
            string json = null;
            bool ok = ApplicationData.Current.LocalSettings.Values.TryGetValue("config", out object temp);
            if (ok)
                json = temp.ToString();

            if (string.IsNullOrEmpty(json))
            {
                SettingObject setting = SettingObject.GetDefaultSetting();
                json = await JsonHelper.JsonSerializeAsync(setting);
            }

            var config = await JsonHelper.JsonDeserializeAsync<SettingObject>(json);
            if (config.General == null)
                config.General = new GeneralSetting();
            //UWP
            string descPath = Path.Combine(Windows.ApplicationModel.Package.Current.InstalledLocation.Path, "Res\\setting.desc.json");
            var descConfig = await JsonHelper.JsonDeserializeFromFileAsync<dynamic>(descPath);
            JsonConfierViewModel = _jcrService.GetVM(JObject.FromObject(config), descConfig);
        }

        public async void SaveConfig()
        {
            var data = _jcrService.GetData(JsonConfierViewModel.Nodes);
            await ApplicationData.Current.LocalSettings.SaveAsync("config", data);
        }
    }
}
