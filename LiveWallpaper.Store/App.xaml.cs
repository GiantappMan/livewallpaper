using System;
using System.Collections.Generic;

using Caliburn.Micro;
using LiveWallpaper.Store.Helpers;
using LiveWallpaper.Store.Models.Settngs;
using LiveWallpaper.Store.Services;
using LiveWallpaper.Store.ViewModels;

using Windows.ApplicationModel.Activation;
using Windows.Foundation;
using Windows.Storage;
using Windows.UI.Popups;
using Windows.UI.Xaml;

namespace LiveWallpaper.Store
{
    [Windows.UI.Xaml.Data.Bindable]
    public sealed partial class App
    {
        private Lazy<ActivationService> _activationService;

        private ActivationService ActivationService
        {
            get { return _activationService.Value; }
        }

        public App()
        {
            InitializeComponent();

            Initialize();

            // Deferred execution until used. Check https://msdn.microsoft.com/library/dd642331(v=vs.110).aspx for further info on Lazy<T> class.
            _activationService = new Lazy<ActivationService>(CreateActivationService);
        }

        protected override async void OnLaunched(LaunchActivatedEventArgs args)
        {
            if (!args.PrelaunchActivated)
            {
                await ActivationService.ActivateAsync(args);
            }
        }

        protected override async void OnActivated(IActivatedEventArgs e)
        {
            if (e.Kind == ActivationKind.Protocol)
            {
                ProtocolActivatedEventArgs protocolArgs = (ProtocolActivatedEventArgs)e;
                Uri uri = protocolArgs.Uri;
                if (uri.Scheme == "live.wallpaper.store")
                {
                    if (!string.IsNullOrEmpty(uri.Query))
                    {
                        WwwFormUrlDecoder decoder = new WwwFormUrlDecoder(uri.Query);
                        if (decoder.Count > 0)
                        {
                            var host = decoder[0].Value;
                            var setting = new SettingObject();
                            setting.Server = new ServerSetting();
                            setting.Server.ServerUrl = host;
                            await ApplicationData.Current.LocalSettings.SaveAsync("config", setting);
                        }
                    }

                    await ActivationService.ActivateAsync(e);
                }
            }
        }

        private WinRTContainer _container;

        protected override void Configure()
        {
            // This configures the framework to map between MainViewModel and MainPage
            // Normally it would map between MainPageViewModel and MainPage
            var config = new TypeMappingConfiguration
            {
                IncludeViewSuffixInViewModelNames = false
            };

            ViewLocator.ConfigureTypeMappings(config);
            ViewModelLocator.ConfigureTypeMappings(config);

            _container = new WinRTContainer();
            _container.RegisterWinRTServices();

            _container.PerRequest<MainViewModel>()
                .PerRequest<ServerViewModel>()
                .PerRequest<SettingViewModel>()
                .Singleton<AppService>();

            var appService = _container.GetInstance<AppService>();
        }

        protected override object GetInstance(Type service, string key)
        {
            return _container.GetInstance(service, key);
        }

        protected override IEnumerable<object> GetAllInstances(Type service)
        {
            return _container.GetAllInstances(service);
        }

        protected override void BuildUp(object instance)
        {
            _container.BuildUp(instance);
        }

        private ActivationService CreateActivationService()
        {
            return new ActivationService(_container, typeof(ViewModels.MainViewModel));
        }
    }
}
