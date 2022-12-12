using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace LiveWallpaper.UI
{
    /// <summary>
    /// SystemColorWindow.xaml 的交互逻辑
    /// </summary>
    public partial class SystemColorWindow : Window
    {
        public SystemColorWindow()
        {
            InitializeComponent();

            List<ColorAndName> l = new();

            foreach (PropertyInfo i in typeof(System.Windows.SystemColors).GetProperties())
            {
                if (i.PropertyType == typeof(Color))
                {
                    ColorAndName cn = new();
                    cn.Color = (Color)i.GetValue(new Color(), BindingFlags.GetProperty, null, null, null);
                    cn.Name = i.Name;
                    l.Add(cn);
                }
            }

            SystemColorsList.DataContext = l;
        }
    }

    class ColorAndName
    {
        public Color Color { get; set; }
        public string? Name { get; set; }
    }
}
