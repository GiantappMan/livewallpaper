using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;

namespace LiveWallpaper.LocalServer.Utils
{
    /// <summary>
    /// 本地服务对外接口的安全校验：路径越界、危险文件类型、下载地址(SSRF)
    /// </summary>
    public static class SecurityGuard
    {
        /// <summary>
        /// 可被系统直接执行或加载的扩展名，禁止通过网络接口写入壁纸目录
        /// </summary>
        static readonly HashSet<string> _blockedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".exe", ".dll", ".bat", ".cmd", ".com", ".scr", ".pif", ".msi", ".msp", ".mst",
            ".ps1", ".psm1", ".psd1", ".msh", ".msh1", ".msh2",
            ".vbs", ".vbe", ".jse", ".wsf", ".wsh", ".hta",
            ".jar", ".cpl", ".gadget", ".inf", ".reg", ".lnk",
            ".appx", ".appxbundle", ".msix", ".msixbundle"
        };

        /// <summary>
        /// 规范化路径，失败返回null
        /// </summary>
        public static string? NormalizePath(string? path)
        {
            if (string.IsNullOrWhiteSpace(path))
                return null;
            try
            {
                return Path.GetFullPath(path);
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>
        /// 目标路径是否位于指定目录内（规范化后严格校验，拒绝..\跳出和同前缀目录名）
        /// </summary>
        public static bool IsPathUnderDir(string? rootDir, string? path)
        {
            string? root = NormalizePath(rootDir);
            string? target = NormalizePath(path);
            if (root == null || target == null)
                return false;

            if (!root.EndsWith(Path.DirectorySeparatorChar))
                root += Path.DirectorySeparatorChar;
            if (!target.EndsWith(Path.DirectorySeparatorChar))
                target += Path.DirectorySeparatorChar;

            return target.StartsWith(root, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// 是否为禁止写入的文件类型
        /// </summary>
        public static bool IsBlockedFileExtension(string fileName)
        {
            string ext = Path.GetExtension(fileName);
            if (string.IsNullOrEmpty(ext))
                return false;
            return _blockedExtensions.Contains(ext);
        }

        /// <summary>
        /// 下载地址只允许公网 http/https，拒绝localhost、环回、私有和保留地址，防止SSRF
        /// </summary>
        public static bool IsSafeDownloadUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return false;
            if (!Uri.TryCreate(url, UriKind.Absolute, out Uri? uri))
                return false;
            if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
                return false;

            string host = uri.Host;
            if (string.IsNullOrEmpty(host))
                return false;
            if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase))
                return false;

            //域名可能解析到内网地址，统一按解析出的所有IP判断
            try
            {
                IPAddress[] addresses = Dns.GetHostAddressesAsync(host).GetAwaiter().GetResult();
                if (addresses.Length == 0)
                    return false;
                //fake-ip代理(如Clash默认198.18.0.0/15)会把所有域名解析到基准测试保留网段，
                //实际连接由代理解析，DNS结果不代表内网目标，不能按保留地址拒绝，否则代理用户所有下载都会被误杀
                if (addresses.All(IsFakeIp))
                    return true;
                return addresses.All(IsPublicAddress);
            }
            catch (Exception)
            {
                return false;
            }
        }

        //fake-ip网段：198.18.0.0/15（基准测试，Clash/mihomo默认fake-ip-range）、2001:2::/64
        static bool IsFakeIp(IPAddress ip)
        {
            if (ip.AddressFamily == AddressFamily.InterNetwork)
            {
                byte[] b = ip.GetAddressBytes();
                return b[0] == 198 && (b[1] & 0xFE) == 18;
            }
            if (ip.AddressFamily == AddressFamily.InterNetworkV6)
            {
                byte[] b6 = ip.GetAddressBytes();
                //::ffff:x.y.z.w 按IPv4规则判断
                bool mapped = true;
                for (int i = 0; i < 10; i++)
                    if (b6[i] != 0) { mapped = false; break; }
                if (mapped && b6[10] == 0xff && b6[11] == 0xff)
                    return IsFakeIp(new IPAddress(b6, 12));
                return b6[0] == 0x20 && b6[1] == 0x01 && b6[2] == 0x00 && b6[3] == 0x02;
            }
            return false;
        }

        static bool IsPublicAddress(IPAddress ip)
        {
            if (IPAddress.IsLoopback(ip))
                return false;
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6UniqueLocal)
                return false;
            if (ip.Equals(IPAddress.IPv6None) || ip.Equals(IPAddress.Any) || ip.Equals(IPAddress.None))
                return false;
            if (ip.AddressFamily == AddressFamily.InterNetworkV6)
            {
                byte[] b6 = ip.GetAddressBytes();
                if (b6[0] == 0xff)
                    return false;               //组播
                if (b6.All(x => x == 0))
                    return false;               //未指定地址::
                //::ffff:x.y.z.w 按IPv4规则判断
                bool mapped = true;
                for (int i = 0; i < 10; i++)
                    if (b6[i] != 0) { mapped = false; break; }
                if (mapped && b6[10] == 0xff && b6[11] == 0xff)
                    return IsPublicAddress(new IPAddress(b6, 12));
                return true;
            }
            if (ip.AddressFamily != AddressFamily.InterNetwork)
                return false;

            byte[] b = ip.GetAddressBytes();
            if (b[0] == 0) return false;                                        //0.0.0.0/8
            if (b[0] == 10) return false;                                       //10.0.0.0/8 私有
            if (b[0] == 100 && (b[1] & 0xC0) == 64) return false;               //100.64.0.0/10 CGN
            if (b[0] == 127) return false;                                      //127.0.0.0/8 环回
            if (b[0] == 169 && b[1] == 254) return false;                       //169.254.0.0/16 链路本地
            if (b[0] == 172 && (b[1] & 0xF0) == 16) return false;               //172.16.0.0/12 私有
            if (b[0] == 192 && b[1] == 168) return false;                       //192.168.0.0/16 私有
            if (b[0] == 192 && b[1] == 0 && b[2] == 0) return false;            //192.0.0.0/24 保留
            if (b[0] == 192 && b[1] == 0 && b[2] == 2) return false;            //192.0.2.0/24 测试
            if (b[0] == 198 && (b[1] & 0xFE) == 18) return false;               //198.18.0.0/15 基准测试
            if (b[0] == 198 && b[1] == 51 && b[2] == 100) return false;         //198.51.100.0/24 测试
            if (b[0] == 203 && b[1] == 0 && b[2] == 113) return false;          //203.0.113.0/24 测试
            if ((b[0] & 0xF0) == 224) return false;                             //224.0.0.0/4 组播
            if ((b[0] & 0xF0) == 240) return false;                             //240.0.0.0/4 保留
            return true;
        }
    }
}
