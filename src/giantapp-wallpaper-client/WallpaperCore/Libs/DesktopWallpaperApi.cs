namespace WallpaperCore.Libs;

#region DesktopWallpaperFactory
//https://github.com/Grabacr07/SylphyHorn/blob/28d0405a07f4e0f6bfb73e977f2b16450397847f/source/SylphyHorn/Interop/IDesktopWallpaper.cs
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public struct RECT
{
    public int Left, Top, Right, Bottom;

    public RECT(int left, int top, int right, int bottom)
    {
        Left = left;
        Top = top;
        Right = right;
        Bottom = bottom;
    }

    public RECT(System.Drawing.Rectangle r)
        : this(r.Left, r.Top, r.Right, r.Bottom)
    {
    }

    public int X
    {
        get { return Left; }
        set { Right -= (Left - value); Left = value; }
    }

    public int Y
    {
        get { return Top; }
        set { Bottom -= (Top - value); Top = value; }
    }

    public int Height
    {
        get { return Bottom - Top; }
        set { Bottom = value + Top; }
    }

    public int Width
    {
        get { return Right - Left; }
        set { Right = value + Left; }
    }

    public System.Drawing.Point Location
    {
        get { return new System.Drawing.Point(Left, Top); }
        set { X = value.X; Y = value.Y; }
    }

    public System.Drawing.Size Size
    {
        get { return new System.Drawing.Size(Width, Height); }
        set { Width = value.Width; Height = value.Height; }
    }

    public static implicit operator System.Drawing.Rectangle(RECT r)
    {
        return new System.Drawing.Rectangle(r.Left, r.Top, r.Width, r.Height);
    }

    public static implicit operator RECT(System.Drawing.Rectangle r)
    {
        return new RECT(r);
    }

    public static bool operator ==(RECT r1, RECT r2)
    {
        return r1.Equals(r2);
    }

    public static bool operator !=(RECT r1, RECT r2)
    {
        return !r1.Equals(r2);
    }

    public bool Equals(RECT r)
    {
        return r.Left == Left && r.Top == Top && r.Right == Right && r.Bottom == Bottom;
    }

    public override bool Equals(object obj)
    {
        if (obj is RECT)
            return Equals((RECT)obj);
        else if (obj is System.Drawing.Rectangle)
            return Equals(new RECT((System.Drawing.Rectangle)obj));
        return false;
    }

    public override int GetHashCode()
    {
        return ((System.Drawing.Rectangle)this).GetHashCode();
    }

    public override string ToString()
    {
        return string.Format(System.Globalization.CultureInfo.CurrentCulture, "{{Left={0},Top={1},Right={2},Bottom={3}}}", Left, Top, Right, Bottom);
    }
}

[StructLayout(LayoutKind.Sequential)]
public struct COLORREF
{
    public byte R;
    public byte G;
    public byte B;
}

public enum DesktopSlideshowOptions
{
    DSO_SHUFFLEIMAGES = 0x01,
}

public enum DesktopSlideshowState
{
    DSS_ENABLED = 0x01,
    DSS_SLIDESHOW = 0x02,
    DSS_DISABLED_BY_REMOTE_SESSION = 0x04,
}

public enum DesktopSlideshowDirection
{
    DSD_FORWARD = 0,
    DSD_BACKWARD,
}

public enum DesktopWallpaperPosition
{
    DWPOS_CENTER = 0,
    DWPOS_TILE,
    DWPOS_STRETCH,
    DWPOS_FIT,
    DWPOS_FILL,
    DWPOS_SPAN,
}

[ComImport]
[Guid("B92B56A9-8B55-4E14-9A89-0199BBB6F93B")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDesktopWallpaper
{
    void SetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID, [MarshalAs(UnmanagedType.LPWStr)] string wallpaper);

    [return: MarshalAs(UnmanagedType.LPWStr)]
    string GetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID);

    [return: MarshalAs(UnmanagedType.LPWStr)]
    string GetMonitorDevicePathAt(uint monitorIndex);

    uint GetMonitorDevicePathCount();

    RECT GetMonitorRECT([MarshalAs(UnmanagedType.LPWStr)] string monitorID);

    void SetBackgroundColor([MarshalAs(UnmanagedType.U4)] COLORREF color);

    COLORREF GetBackgroundColor();

    void SetPosition([MarshalAs(UnmanagedType.I4)] DesktopWallpaperPosition position);

    [return: MarshalAs(UnmanagedType.I4)]
    DesktopWallpaperPosition GetPosition();

    void SetSlideshow(IntPtr /* IShellItemArray* */ items);

    IntPtr /* IShellItemArray* */ GetSlideshow();

    void SetSlideshowOptions(DesktopSlideshowOptions options, uint slideshowTick);

    void GetSlideshowOptions(out DesktopSlideshowOptions options, out uint slideshowTick);

    void AdvanceSlideshow([MarshalAs(UnmanagedType.LPWStr)] string monitorID, [MarshalAs(UnmanagedType.I4)] DesktopSlideshowDirection direction);

    DesktopSlideshowState GetStatus();

    void Enable([MarshalAs(UnmanagedType.Bool)] bool enable);
}

public static class DesktopWallpaperFactory
{

    [ComImport]
    [Guid("C2CF3110-460E-4fc1-B9D0-8A1C0C9CC4BD")]
    class DesktopWallpaperCoclass { }

    public static IDesktopWallpaper Create()
    {
        return (IDesktopWallpaper)new DesktopWallpaperCoclass();
    }
}
#endregion

//系统壁纸接口
public class DesktopWallpaperApi
{
    static Lazy<IDesktopWallpaper> _desktopFactory = CreateInstance();


    public static async Task<string> SetWallpaper(string? filePath, Screen? screen)
    {
        if (filePath == null || screen == null)
            return string.Empty;

        var monitorId = GetMonitoryId(screen);
        if (monitorId == null)
            return string.Empty;

        var oldFile = await Task.Run(() => _desktopFactory.Value.GetWallpaper(monitorId));

        await Task.Run(() => _desktopFactory.Value.SetWallpaper(monitorId, filePath));
        return oldFile;
    }

    #region private
    private static Lazy<IDesktopWallpaper> CreateInstance()
    {
        return new Lazy<IDesktopWallpaper>(() => DesktopWallpaperFactory.Create());
    }
    private static string? GetMonitoryId(Screen? screen)
    {
        if (screen == null)
            return null;

        for (int i = 0; i < Screen.AllScreens.Length; i++)
        {
            string monitorId = _desktopFactory.Value.GetMonitorDevicePathAt((uint)i);
            var rect = _desktopFactory.Value.GetMonitorRECT(monitorId);

            if (rect.Left == screen.Bounds.Left
                && rect.Top == screen.Bounds.Top
                && rect.Right == screen.Bounds.Right
                && rect.Bottom == screen.Bounds.Bottom)
            {
                return monitorId;
            }
        }
        return null;
    }
    #endregion
}
