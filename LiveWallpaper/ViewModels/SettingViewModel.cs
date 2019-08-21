using Caliburn.Micro;
using JsonConfiger;
using JsonConfiger.Models;
using LiveWallpaper.Settings;
using LiveWallpaper.Managers;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using Windows.Storage;
using DZY.Util.Common.Helpers;
using MultiLanguageForXAML;

namespace LiveWallpaper.ViewModels
{
    public class SettingViewModel : Screen
    {
        private static NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();
        JCrService _jcrService = new JCrService();

        private static bool firstLaunch = true;
        protected override async void OnInitialize()
        {
            if (firstLaunch)
            {
                firstLaunch = false;
                //读取json按对象重新保存一次。防止json格式不全
                var Setting = await JsonHelper.JsonDeserializeFromFileAsync<SettingObject>(AppManager.SettingPath);
                await JsonHelper.JsonSerializeAsync(Setting, AppManager.SettingPath);
            }

            var config = await JsonHelper.JsonDeserializeFromFileAsync<dynamic>(AppManager.SettingPath);
            //string descPath = Path.Combine(AppDomain.CurrentDomain.SetupInformation.ApplicationBase, "Res\\setting.desc.json");
            var descConfig = await JsonHelper.JsonDeserializeFromFileAsync<dynamic>(AppManager.SettingDescFile);

            List<dynamic> audioSource = new List<dynamic>();
            List<dynamic> displayMonitor = new List<dynamic>();
            displayMonitor.Add(new
            {
                lanKey = "setting_displayMonitor_default",
                value = -1
            });
            audioSource.Add(new
            {
                lanKey = "setting_audioSource_mute",
                value = -1
            });

            string screenStr = await LanService.Get("setting_screen");
            for (int i = 0; i < System.Windows.Forms.Screen.AllScreens.Length; i++)
            {
                displayMonitor.Add(new
                {
                    lan = string.Format($"{screenStr} {i + 1}"),
                    value = i
                });
                audioSource.Add(new
                {
                    lan = string.Format($"{screenStr} {i + 1}"),
                    value = i
                });
            }

            _jcrService.InjectDescObjs("$AudioSource", audioSource);
            _jcrService.InjectDescObjs("$DisplayMonitor", displayMonitor);

            JsonConfierViewModel = _jcrService.GetVM(config, descConfig);
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

        #region DialogResult

        /// <summary>
        /// The <see cref="DialogResult" /> property's name.
        /// </summary>
        public const string DialogResultPropertyName = "DialogResult";

        private bool _DialogResult;

        /// <summary>
        /// DialogResult
        /// </summary>
        public bool DialogResult
        {
            get { return _DialogResult; }

            set
            {
                if (_DialogResult == value) return;

                _DialogResult = value;
                NotifyOfPropertyChange(DialogResultPropertyName);
            }
        }

        #endregion

        #endregion

        public async void Save()
        {
            var data = _jcrService.GetData(JsonConfierViewModel.Nodes);
            await JsonHelper.JsonSerializeAsync(data, AppManager.SettingPath);
            DialogResult = true;
            TryClose();
        }

        public void Cancel()
        {
            DialogResult = false;
            TryClose();
        }

        public void OpenConfigFolder()
        {
            try
            {
                string path = null;
                DesktopBridge.Helpers helpers = new DesktopBridge.Helpers();
                if (helpers.IsRunningAsUwp())
                {
                    //https://stackoverflow.com/questions/48849076/uwp-app-does-not-copy-file-to-appdata-folder
                    path = Path.Combine(ApplicationData.Current.LocalCacheFolder.Path, "Roaming\\LiveWallpaper");
                }
                else
                {
                    path = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                    path = Path.Combine(path, "LiveWallpaper");
                }
                Process.Start(path);
            }
            catch (Exception ex)
            {
                logger.Warn("OpenConfigFolder:" + ex);
            }
        }
    }
}
