using Caliburn.Micro;
using JsonConfiger;
using JsonConfiger.Models;
using LiveWallpaper.Helpers;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.ViewModels
{
    public class SettingViewModel : Screen
    {
        JCrService service = new JCrService();
        protected override async void OnInitialize()
        {
            var config = await ConfigHelper.LoadConfigAsync<dynamic>();
            if (config == null)
            {
                string defaultConfig = Path.Combine(Environment.CurrentDirectory, "Configs\\default_config.json");
                config = await ConfigHelper.LoadConfigAsync<dynamic>(defaultConfig);
            }
            JsonConfierViewModel = service.GetVM(config);
            base.OnInitialize();
        }

        protected override void OnDeactivate(bool close)
        {
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
    }
}
