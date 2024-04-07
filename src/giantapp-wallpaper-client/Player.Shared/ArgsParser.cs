
using System.Text.RegularExpressions;

namespace Player.Shared;

public class ArgsParser
{
    private string[] _args;

    public ArgsParser(string[] args)
    {
        _args = args;
    }

    public string? Get(string key)
    {
        string pattern = $@"--{key}=(?<value>.*)";
        Regex regex = new(pattern);

        foreach (var arg in _args)
        {
            Match match = regex.Match(arg);
            if (match.Success)
            {
                return match.Groups["value"].Value;
            }
        }

        return null;
    }
}
