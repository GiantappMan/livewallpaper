using Microsoft.Win32;
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Windows.ApplicationModel;

namespace Client.Libs
{
    /// <summary>
    /// 开机管理
    /// </summary>
    class AutoStart
    {
        // see https://stackoverflow.com/questions/12945805/odd-c-sharp-path-issue
        // net core 获取出来是dll，而framework是exe。所以暴露出来让外面传
        //private readonly string ExecutablePath = System.Reflection.Assembly.GetEntryAssembly().Location;

        private readonly string _executablePath;
        private readonly string _key;

        public AutoStart(string key, string executablePath)
        {
            _key = key;
            _executablePath = executablePath;
        }

        #region public

        public async Task<bool> Set(bool enabled)
        {
            if (IsRunningAsUwp())
                return await UWPSet(enabled);
            else
                return DeskTopSet(enabled);
        }

        public async Task<bool> Check()
        {
            if (IsRunningAsUwp())
                return await UWPCheck();
            else
                return DeskTopCheck();
        }

        public async Task<bool> UWPSet(bool enabled)
        {
            try
            {
                StartupTask startupTask = await StartupTask.GetAsync(_key);
                if (!enabled && startupTask.State == StartupTaskState.Enabled)
                {
                    startupTask.Disable();
                    return true;
                }

                if (enabled)
                {
                    switch (await startupTask.RequestEnableAsync())
                    {
                        case StartupTaskState.DisabledByUser:
                            return false;
                        case StartupTaskState.Enabled:
                            return true;
                    }
                }

                return false;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public async Task<bool> UWPCheck()
        {
            try
            {
                bool result = false;
                 switch ((await StartupTask.GetAsync(_key)).State)
                {
                    case StartupTaskState.Disabled:
                        result = false;
                        break;
                    case StartupTaskState.DisabledByUser:
                        result = false;
                        break;
                    case StartupTaskState.Enabled:
                        result = true;
                        break;
                }

                return result;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public bool DeskTopSet(bool enabled)
        {
            RegistryKey? runKey = null;
            try
            {
                runKey = OpenRegKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
                if (runKey == null)
                {
                    return false;
                }
                if (enabled)
                {
                    runKey.SetValue(_key, _executablePath);
                }
                else
                {
                    //判断key存在
                    if (runKey.GetValue(_key) != null)
                        runKey.DeleteValue(_key);
                }
                return true;
            }
            catch (Exception e)
            {
                System.Diagnostics.Debug.WriteLine(e);
                return false;
            }
            finally
            {
                if (runKey != null)
                {
                    try
                    {
                        runKey.Close();
                        runKey.Dispose();
                    }
                    catch (Exception e)
                    {
                        System.Diagnostics.Debug.WriteLine(e);
                    }
                }
            }
        }

        public bool DeskTopCheck()
        {
            RegistryKey? runKey = null;
            try
            {
                runKey = OpenRegKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
                if (runKey == null)
                {
                    return false;
                }
                string[] runList = runKey.GetValueNames();
                foreach (string item in runList)
                {
                    if (item.Equals(_key, StringComparison.OrdinalIgnoreCase))
                        return true;
                }
                return false;
            }
            catch (Exception e)
            {
                System.Diagnostics.Debug.WriteLine(e);
                return false;
            }
            finally
            {
                if (runKey != null)
                {
                    try
                    {
                        runKey.Close();
                        runKey.Dispose();
                    }
                    catch (Exception e)
                    {
                        System.Diagnostics.Debug.WriteLine(e);
                    }
                }
            }
        }

        #endregion

        #region private
        private static RegistryKey? OpenRegKey(string name, bool writable, RegistryHive hive = RegistryHive.CurrentUser)
        {
            // we are building x86 binary for both x86 and x64, which will
            // cause problem when opening registry key
            // detect operating system instead of CPU
            if (string.IsNullOrEmpty(name)) throw new ArgumentException(null, nameof(name));
            try
            {
                RegistryKey? userKey = RegistryKey.OpenBaseKey(hive,
                        Environment.Is64BitOperatingSystem ? RegistryView.Registry64 : RegistryView.Registry32)
                    .OpenSubKey(name, writable);
                return userKey;
            }
            catch (ArgumentException ae)
            {
                System.Diagnostics.Debug.WriteLine(ae);
                return null;
            }
            catch (Exception e)
            {
                System.Diagnostics.Debug.WriteLine(e);
                return null;
            }
        }
        const long APPMODEL_ERROR_NO_PACKAGE = 15700L;

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern int GetCurrentPackageFullName(ref int packageFullNameLength, StringBuilder packageFullName);

        public bool IsRunningAsUwp()
        {
            if (IsWindows7OrLower)
            {
                return false;
            }
            else
            {
                int length = 0;
                StringBuilder sb = new(0);
                GetCurrentPackageFullName(ref length, sb);

                sb = new StringBuilder(length);
                int result = GetCurrentPackageFullName(ref length, sb);

                return result != APPMODEL_ERROR_NO_PACKAGE;
            }
        }

        private bool IsWindows7OrLower
        {
            get
            {
                int versionMajor = Environment.OSVersion.Version.Major;
                int versionMinor = Environment.OSVersion.Version.Minor;
                double version = versionMajor + (double)versionMinor / 10;
                return version <= 6.1;
            }
        }
        #endregion
    }
}
