using Microsoft.Win32;
using System;

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
        private readonly string _Key;

        public AutoStart(string key, string executablePath)
        {
            _Key = key;
            _executablePath = executablePath;
        }

        #region public
        public bool Set(bool enabled)
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
                    runKey.SetValue(_Key, _executablePath);
                }
                else
                {
                    //判断key存在
                    if (runKey.GetValue(_Key) != null)
                        runKey.DeleteValue(_Key);
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

        public bool Check()
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
                    if (item.Equals(_Key, StringComparison.OrdinalIgnoreCase))
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
        #endregion
    }
}
