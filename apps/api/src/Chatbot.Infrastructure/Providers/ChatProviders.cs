using System.Net.Http.Json;
using System.Text.Json;
using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Domain;
namespace Chatbot.Infrastructure.Providers;

internal static class Http
{
    public static async Task<JsonDocument> SendAsync(HttpClient http, HttpRequestMessage req, string name, CancellationToken ct)
    {
        using var res = await http.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode) throw new ProviderException($"{name} {(int)res.StatusCode}: {(body.Length > 300 ? body[..300] : body)}");
        return JsonDocument.Parse(body);
    }
    public static int Int(JsonElement e, string name) => e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt32() : 0;
}

public sealed class OpenAiCompatibleProvider(HttpClient http) : IChatProvider
{
    public ProviderType Type => ProviderType.OpenAiCompatible;
    public async Task<ChatCompletion> CompleteAsync(ModelConnection c, string system, IReadOnlyList<ChatTurn> turns, int maxTokens, CancellationToken ct)
    {
        var msgs = new List<object> { new { role = "system", content = system } };
        msgs.AddRange(turns.Select(t => (object)new { role = t.Role, content = t.Content }));
        using var req = new HttpRequestMessage(HttpMethod.Post, c.BaseUrl.TrimEnd('/') + "/chat/completions")
        { Content = JsonContent.Create(new { model = c.ModelName, temperature = 0.2, max_tokens = maxTokens, messages = msgs }) };
        if (!string.IsNullOrEmpty(c.ApiKey)) req.Headers.Authorization = new("Bearer", c.ApiKey);
        using var doc = await Http.SendAsync(http, req, "openai", ct);
        var root = doc.RootElement;
        var text = root.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
        root.TryGetProperty("usage", out var u);
        return new(text, Http.Int(u, "prompt_tokens"), Http.Int(u, "completion_tokens"));
    }
}

public sealed class AnthropicProvider(HttpClient http) : IChatProvider
{
    public ProviderType Type => ProviderType.Anthropic;
    public async Task<ChatCompletion> CompleteAsync(ModelConnection c, string system, IReadOnlyList<ChatTurn> turns, int maxTokens, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = JsonContent.Create(new
            {
                model = c.ModelName, max_tokens = maxTokens, temperature = 0.2, system,
                messages = turns.Select(t => new { role = t.Role, content = t.Content }).ToArray()
            })
        };
        req.Headers.Add("x-api-key", c.ApiKey); req.Headers.Add("anthropic-version", "2023-06-01");
        using var doc = await Http.SendAsync(http, req, "anthropic", ct);
        var root = doc.RootElement;
        var text = string.Concat(root.GetProperty("content").EnumerateArray().Select(b => b.TryGetProperty("text", out var t) ? t.GetString() : ""));
        root.TryGetProperty("usage", out var u);
        return new(text, Http.Int(u, "input_tokens"), Http.Int(u, "output_tokens"));
    }
}

public sealed class GeminiProvider(HttpClient http) : IChatProvider
{
    public ProviderType Type => ProviderType.Gemini;
    public async Task<ChatCompletion> CompleteAsync(ModelConnection c, string system, IReadOnlyList<ChatTurn> turns, int maxTokens, CancellationToken ct)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(c.ModelName)}:generateContent";
        using var req = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(new
            {
                systemInstruction = new { parts = new[] { new { text = system } } },
                generationConfig = new { temperature = 0.2, maxOutputTokens = maxTokens },
                contents = turns.Select(t => new { role = t.Role == "assistant" ? "model" : "user", parts = new[] { new { text = t.Content } } }).ToArray()
            })
        };
        req.Headers.Add("x-goog-api-key", c.ApiKey);
        using var doc = await Http.SendAsync(http, req, "gemini", ct);
        var root = doc.RootElement;
        var parts = root.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts");
        var text = string.Concat(parts.EnumerateArray().Select(p => p.TryGetProperty("text", out var t) ? t.GetString() : ""));
        root.TryGetProperty("usageMetadata", out var u);
        return new(text, Http.Int(u, "promptTokenCount"), Http.Int(u, "candidatesTokenCount"));
    }
}

public sealed class ChatProviderFactory(IEnumerable<IChatProvider> providers) : IChatProviderFactory
{
    public IChatProvider For(ProviderType type) => providers.FirstOrDefault(p => p.Type == type) ?? throw new ProviderException($"Provider {type} is not supported.");
}

/// <summary>Speech via OpenAI-compatible /audio endpoints (OpenAI, Groq Whisper, etc.).</summary>
public sealed class OpenAiSpeechProvider(HttpClient http) : ISpeechProvider
{
    public async Task<string> TranscribeAsync(ModelConnection c, Stream audio, string fileName, CancellationToken ct)
    {
        using var form = new MultipartFormDataContent { { new StringContent(c.ModelName), "model" }, { new StreamContent(audio), "file", fileName } };
        using var req = new HttpRequestMessage(HttpMethod.Post, c.BaseUrl.TrimEnd('/') + "/audio/transcriptions") { Content = form };
        if (!string.IsNullOrEmpty(c.ApiKey)) req.Headers.Authorization = new("Bearer", c.ApiKey);
        using var doc = await Http.SendAsync(http, req, "stt", ct);
        return doc.RootElement.GetProperty("text").GetString() ?? "";
    }

    public async Task<byte[]> SynthesizeAsync(ModelConnection c, string text, string voice, double speed, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, c.BaseUrl.TrimEnd('/') + "/audio/speech")
        { Content = JsonContent.Create(new { model = c.ModelName, input = text, voice, speed }) };
        if (!string.IsNullOrEmpty(c.ApiKey)) req.Headers.Authorization = new("Bearer", c.ApiKey);
        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode) throw new ProviderException($"tts {(int)res.StatusCode}");
        return await res.Content.ReadAsByteArrayAsync(ct);
    }
}
