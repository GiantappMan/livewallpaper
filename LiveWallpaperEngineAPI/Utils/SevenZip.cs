using SharpCompress.Archives;
using SharpCompress.Archives.SevenZip;
using SharpCompress.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Giantapp.LiveWallpaper.Engine.Utils
{

    class SevenZipUnzipProgressArgs : EventArgs
    {
        public float Progress { get; internal set; }
    }

    class SevenZip
    {
        private readonly string _zipFile;
        private long _total;
        private long _completed;
        public event EventHandler<SevenZipUnzipProgressArgs> UnzipProgressChanged;


        public SevenZip(string zipPath)
        {
            _zipFile = zipPath;
        }

        internal void Extract(string path, System.Threading.CancellationToken token)
        {
            _total = 0;
            _completed = 0;
            using var archive = SevenZipArchive.Open(_zipFile);
            //try
            //{
            //    archive.CompressedBytesRead += Archive_CompressedBytesRead;
            _total = archive.Entries.Sum(m => m.Size);
            foreach (var entry in archive.Entries.Where(entry => !entry.IsDirectory))
            {
                token.ThrowIfCancellationRequested();
                entry.WriteToDirectory(path, new ExtractionOptions()
                {
                    ExtractFullPath = true,
                    Overwrite = true
                });

                _completed += entry.Size;
                UnzipProgressChanged?.Invoke(this, new SevenZipUnzipProgressArgs()
                {
                    Progress = (float)_completed / _total
                });
                //System.Diagnostics.Debug.WriteLine($"{_completed} {_total}");
            }
            //    }
            //    catch (Exception)
            //    {
            //        throw;
            //    }
            //    finally
            //    {
            //        archive.CompressedBytesRead -= Archive_CompressedBytesRead;
            //    }
        }

        internal static Task<bool> CanOpenAsync(string file)
        {
            return Task.Run(() => CanOpen(file));
        }

        internal static bool CanOpen(string downloadFile)
        {
            try
            {
                using var archive = SevenZipArchive.Open(downloadFile);
                return archive.Entries.Count > 0;
            }
            catch (Exception)
            {
                return false;
            }
        }

        //private void Archive_CompressedBytesRead(object sender, CompressedBytesReadEventArgs e)
        //{
        //    _completed += e.CompressedBytesRead;
        //    //System.Diagnostics.Debug.WriteLine($"{e.CompressedBytesRead} {e.CurrentFilePartCompressedBytesRead}");
        //    //System.Diagnostics.Debug.WriteLine($"-----------{_tmp} {_total}");
        //    UnzipProgressChanged?.Invoke(this, new SevenZipUnzipProgressArgs()
        //    {
        //        Progress = (float)_completed / _total
        //    });
        //    System.Diagnostics.Debug.WriteLine($"{_completed} {_total}");
        //}
    }
}
