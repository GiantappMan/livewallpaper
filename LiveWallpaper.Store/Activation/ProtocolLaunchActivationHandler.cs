using Caliburn.Micro;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.ApplicationModel.Activation;

namespace LiveWallpaper.Store.Activation
{
    internal class ProtocolLaunchActivationHandler : ActivationHandler<ProtocolActivatedEventArgs>
    {
        private readonly Type _navElement;
        private readonly INavigationService _navigationService;

        public ProtocolLaunchActivationHandler(Type navElement, INavigationService navigationService)
        {
            _navElement = navElement;
            _navigationService = navigationService;
        }

        protected override async Task HandleInternalAsync(ProtocolActivatedEventArgs args)
        {
            // When the navigation stack isn't restored navigate to the first page,
            // configuring the new page by passing required information as a navigation
            // parameter
            _navigationService.NavigateToViewModel(_navElement, args.Uri);

            await Task.CompletedTask;
        }

        protected override bool CanHandleInternal(ProtocolActivatedEventArgs args)
        {
            // None of the ActivationHandlers has handled the app activation
            return _navigationService.SourcePageType == null;
        }
    }
}
