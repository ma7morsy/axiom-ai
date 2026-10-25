using Chatbot.Domain;
namespace Chatbot.Application.Dtos;

public record RegisterRequest(string Email, string Password, string? DisplayName);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string Email, string Role, string DisplayName);

public record ModelDto(Guid Id, string DisplayName, ProviderType Provider, string ModelName, string BaseUrl, bool HasKey, int Priority,
    string[] Capabilities, decimal InputPricePer1K, decimal OutputPricePer1K, bool IsActive);
public record ModelRequest(string DisplayName, ProviderType Provider, string ModelName, string? BaseUrl, string? ApiKey, int Priority,
    string[]? Capabilities, decimal InputPricePer1K, decimal OutputPricePer1K, bool IsActive);
public record ModelTestResult(bool Ok, string Message);

public record AgentDto(Guid Id, string Slug, string Name, string Description, string Welcome, string Instructions, bool IsLive, Guid? PreferredModelId, int DocumentCount);
public record AgentRequest(string Name, string? Description, string? Welcome, string? Instructions, bool IsLive, Guid? PreferredModelId);
public record PublicAgentDto(string Name, string Welcome);

public record DocumentDto(Guid Id, Guid AgentId, string FileName, int Characters, DateTime CreatedAt);
public record UploadResultDto(string Name, bool Ok, string? Error);

public record SendMessageRequest(Guid AgentId, Guid? ConversationId, string Message);
public record PublicChatRequest(string Session, string Message);
public record ArtifactDto(Guid Id, string Title, string Type, int Version, string Content);
public record MessageDto(Guid Id, string Role, string Content, string[] Sources, string? ModelName, DateTime CreatedAt, List<ArtifactDto> Artifacts);
public record ChatReplyDto(Guid ConversationId, MessageDto Message);
public record ConversationDto(Guid Id, Guid AgentId, string AgentName, string Title, DateTime UpdatedAt, int MessageCount);
public record ReviseArtifactRequest(string Instruction);

public record MediaJobDto(Guid Id, MediaKind Kind, string Prompt, string Style, int DurationSeconds, string AspectRatio, JobStatus Status, int Progress, string? ResultUrl, string? Error, decimal EstimatedCost, DateTime CreatedAt);
public record CreateMediaJobRequest(MediaKind Kind, string Prompt, string? Style, int DurationSeconds, string? AspectRatio);
public record EstimateDto(decimal Cost);

public record VoiceDto(Guid Id, string Name, string Language, int DurationSeconds, DateTime CreatedAt);
public record TtsRequest(string Text, string? Voice, double Speed);
public record SttResult(string Text);

public record UsageByModelDto(string Model, int Requests, decimal Cost);
public record UsageSummaryDto(int TotalRequests, decimal TotalCost, int MediaUsed, int MediaQuota, List<UsageByModelDto> ByModel);
