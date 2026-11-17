using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using NLog;

namespace WallpaperCore.Libs;

/// <summary>
/// 子进程 Job 对象：把派生的 mpv.exe 挂进 KILL_ON_JOB_CLOSE 的 Job，主程序无论
/// 怎么死（崩溃、被安装器/任务管理器强杀）都会连带终止 mpv，根治孤儿进程锁住
/// 安装目录文件的问题。全进程共用一个 Job，句柄永不关闭，随主进程退出自动回收。
/// </summary>
internal static class ChildProcessJob
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private static IntPtr _handle = IntPtr.Zero;
    private static readonly object _lock = new();

    public static void Assign(Process process)
    {
        try
        {
            lock (_lock)
            {
                if (_handle == IntPtr.Zero)
                    _handle = CreateKillOnCloseJob();
                if (_handle == IntPtr.Zero)
                    return;
            }
            if (!process.HasExited)
                AssignProcessToJobObject(_handle, process.Handle);
        }
        catch (Exception ex)
        {
            //挂 Job 失败不影响播放，孤儿问题另有安装器 taskkill 兜底
            _logger.Warn(ex, "Failed to assign child process to job.");
        }
    }

    private static IntPtr CreateKillOnCloseJob()
    {
        IntPtr handle = CreateJobObjectW(IntPtr.Zero, null);
        if (handle == IntPtr.Zero)
            return IntPtr.Zero;

        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            BasicLimitInformation = new JOBOBJECT_BASIC_LIMIT_INFORMATION
            {
                LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            }
        };
        int size = Marshal.SizeOf(info);
        IntPtr ptr = Marshal.AllocHGlobal(size);
        try
        {
            Marshal.StructureToPtr(info, ptr, false);
            SetInformationJobObject(handle, JobObjectExtendedLimitInformation, ptr, size);
        }
        finally
        {
            Marshal.FreeHGlobal(ptr);
        }
        return handle;
    }

    private const int JobObjectExtendedLimitInformation = 9;
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr CreateJobObjectW(IntPtr lpJobAttributes, string? lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(IntPtr hJob, int infoClass, IntPtr lpInfo, int cbInfo);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);
}
