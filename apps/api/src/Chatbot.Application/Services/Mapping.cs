using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Chatbot.Domain;
namespace Chatbot.Application.Services;

public static class Mapping
{
    public static ModelDto ToDto(this AiModel m) => new(m.Id, m.DisplayName, m.Provider, m.ModelName, m.BaseUrl, !string.IsNullOrEmpty(m.ApiKeyEncrypted),
        m.Priority, CapabilityMap.ToNames(m.Capabilities), m.InputPricePer1K, m.OutputPricePer1K, m.IsActive);
    public static AgentDto ToDto(this Agent a, int docs) => new(a.Id, a.Slug, a.Name, a.Description, a.Welcome, a.Instructions, a.IsLive, a.PreferredModelId, docs);
    public static DocumentDto ToDto(this Document d) => new(d.Id, d.AgentId, d.FileName, d.Characters, d.CreatedAt);
    public static MediaJobDto ToDto(this MediaJob j) => new(j.Id, j.Kind, j.Prompt, j.Style, j.DurationSeconds, j.AspectRatio, j.Status, j.Progress, j.ResultUrl, j.Error, j.EstimatedCost, j.CreatedAt);
    public static VoiceDto ToDto(this Voice v) => new(v.Id, v.Name, v.Language, v.DurationSeconds, v.CreatedAt);
    public static ArtifactDto ToDto(this Artifact a)
    {
        var v = a.Versions.OrderByDescending(x => x.Version).First();
        return new(a.Id, a.Title, a.Type, v.Version, v.Content);
    }
    public static MessageDto ToDto(this Message m, string? modelName = null) => new(m.Id, m.Role == MessageRole.User ? "user" : "assistant", m.Content, m.Sources,
        modelName, m.CreatedAt, m.Artifacts.Where(a => a.Versions.Count > 0).Select(a => a.ToDto()).ToList());
}
