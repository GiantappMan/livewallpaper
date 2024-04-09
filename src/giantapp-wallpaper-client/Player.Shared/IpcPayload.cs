using System.Text.Json.Serialization;

namespace Player.Shared;

public class IpcPayload
{
    [JsonPropertyName("command")]
    public object[]? Command { get; set; }
    [JsonPropertyName("request_id")]
    public string? RequestId { get; set; }
    [JsonPropertyName("data")]
    public string? Data { get; set; }
}
