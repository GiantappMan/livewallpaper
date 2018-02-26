using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;

namespace WallpaperTool
{
    public class DragManager
    {
        #region CanDrag


        public static bool GetCanDrag(DependencyObject obj)
        {
            return (bool)obj.GetValue(CanDragProperty);
        }

        public static void SetCanDrag(DependencyObject obj, bool value)
        {
            obj.SetValue(CanDragProperty, value);
        }

        // Using a DependencyProperty as the backing store for CanDrag.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty CanDragProperty =
            DependencyProperty.RegisterAttached("CanDrag", typeof(bool), typeof(DragManager), new PropertyMetadata(false, DargChanged));

        private static void DargChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            bool value = (bool)e.NewValue;
            TextBox txt = d as TextBox;
            if (value)
            {
                txt.AllowDrop = true;
                txt.PreviewDragOver += Txt_PreviewDragOver;
                txt.PreviewDrop += Txt_PreviewDrop;
            }
            else
            {
                txt.AllowDrop = false;
                txt.PreviewDragOver -= Txt_PreviewDragOver;
                txt.PreviewDrop -= Txt_PreviewDrop;
            }
        }

        private static void Txt_PreviewDrop(object sender, DragEventArgs args)
        {
            TextBox txt = sender as TextBox;
            args.Handled = true;

            var fileName = IsSingleFile(args);
            if (fileName == null) return;

            txt.Text = fileName;
        }

        private static void Txt_PreviewDragOver(object sender, DragEventArgs args)
        {
            // As an arbitrary design decision, we only want to deal with a single file.
            args.Effects = IsSingleFile(args) != null ? DragDropEffects.Copy : DragDropEffects.None;

            // Mark the event as handled, so TextBox's native DragOver handler is not called.
            args.Handled = true;
        }


        #endregion

        private static string IsSingleFile(DragEventArgs args)
        {
            // Check for files in the hovering data object.
            if (args.Data.GetDataPresent(DataFormats.FileDrop, true))
            {
                var fileNames = args.Data.GetData(DataFormats.FileDrop, true) as string[];
                // Check fo a single file or folder.
                if (fileNames.Length == 1)
                {
                    // Check for a file (a directory will return false).
                    if (File.Exists(fileNames[0]))
                    {
                        // At this point we know there is a single file.
                        return fileNames[0];
                    }

                    if (Directory.Exists(fileNames[0]))
                        return fileNames[0];
                }
            }
            return null;
        }
    }
}
