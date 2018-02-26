using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace VideoPlayer
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        public static string[] Args { get; internal set; }
        protected override void OnStartup(StartupEventArgs e)
        {

            Args = e.Args;
            base.OnStartup(e);
        }
    }
}
