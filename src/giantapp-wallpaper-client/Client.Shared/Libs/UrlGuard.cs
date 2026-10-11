using System;

namespace Client.Libs;

/// <summary>
/// 打开外部链接前的校验：仅放行公网 http/https 地址，
/// 拒绝其他 scheme 与 localhost、环回、私有、保留地址
/// </summary>
public static class UrlGuard
{
    public static bool IsSafeHttpUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return false;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return false;
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            return false;

        // IPv6 字面量的 Host 带方括号（[::1]），先去掉再判断
        string host = uri.Host.TrimStart('[').TrimEnd(']').TrimEnd('.').ToLowerInvariant();
        if (host.Length == 0)
            return false;
        if (host == "localhost" || host.EndsWith(".localhost") || host.EndsWith(".local") || host.EndsWith(".internal"))
            return false;
        if (host.Contains(":"))
        {
            //IPv6 仅放行全球单播（2000::/3），环回/唯一本地/链路本地/未指定一律拒绝
            return host.StartsWith("2") || host.StartsWith("3");
        }

        //IPv4 点分形式：环回/私有/保留段一律拒绝
        string[] parts = host.Split('.');
        if (parts.Length == 4 && Array.TrueForAll(parts, p => byte.TryParse(p, out _)))
        {
            int a = int.Parse(parts[0]);
            int b = int.Parse(parts[1]);
            int c = int.Parse(parts[2]);
            return !(a == 0 || a == 10 || a == 127
                || (a == 100 && b >= 64 && b <= 127)
                || (a == 169 && b == 254)
                || (a == 172 && b >= 16 && b <= 31)
                || (a == 192 && b == 168)
                || (a == 192 && b == 0 && (c == 0 || c == 2))
                || (a == 198 && b == 51 && c == 100)
                || (a == 203 && b == 0 && c == 113)
                || a >= 224);
        }
        return true;
    }
}
