namespace Chatbot.Domain;

public abstract class Entity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
public interface ISoftDeletable { DateTime? DeletedAt { get; set; } }

public enum UserRole { Member = 0, Admin = 1 }
public enum ProviderType { OpenAiCompatible = 0, Anthropic = 1, Gemini = 2 }
[Flags] public enum Capability { None = 0, Text = 1, Vision = 2, Stt = 4, Tts = 8, Image = 16, Video = 32 }
public enum MessageRole { User = 0, Assistant = 1 }
public enum UsageKind { Chat = 0, Stt = 1, Tts = 2, Image = 3, Video = 4 }
public enum MediaKind { Image = 0, TextToVideo = 1, ImageToVideo = 2 }
public enum JobStatus { Queued = 0, Running = 1, Done = 2, Failed = 3 }

public class User : Entity
{
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public UserRole Role { get; set; } = UserRole.Member;
}

public class AiModel : Entity, ISoftDeletable
{
    public string DisplayName { get; set; } = "";
    public ProviderType Provider { get; set; }
    public string ModelName { get; set; } = "";
    public string BaseUrl { get; set; } = "";
    public string ApiKeyEncrypted { get; set; } = "";
    public int Priority { get; set; } = 100;           // lower is tried first
    public Capability Capabilities { get; set; } = Capability.Text;
    public decimal InputPricePer1K { get; set; }
    public decimal OutputPricePer1K { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? DeletedAt { get; set; }
}

public class Agent : Entity, ISoftDeletable
{
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Welcome { get; set; } = "Hi! How can I help you today?";
    public string Instructions { get; set; } = "";
    public bool IsLive { get; set; } = true;
    public Guid? PreferredModelId { get; set; }
    public AiModel? PreferredModel { get; set; }
    public List<Document> Documents { get; set; } = new();
    public DateTime? DeletedAt { get; set; }
}

public class Document : Entity, ISoftDeletable
{
    public Guid AgentId { get; set; }
    public Agent? Agent { get; set; }
    public string FileName { get; set; } = "";
    public int Characters { get; set; }
    public string Text { get; set; } = "";
    public List<DocumentChunk> Chunks { get; set; } = new();
    public DateTime? DeletedAt { get; set; }
}

public class DocumentChunk : Entity
{
    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }
    public Guid AgentId { get; set; }
    public int Position { get; set; }
    public string Content { get; set; } = "";
}

public class Conversation : Entity, ISoftDeletable
{
    public Guid AgentId { get; set; }
    public Agent? Agent { get; set; }
    public Guid? UserId { get; set; }                  // signed-in user
    public string? SessionId { get; set; }             // anonymous customer
    public string Title { get; set; } = "";
    public List<Message> Messages { get; set; } = new();
    public DateTime? DeletedAt { get; set; }
}

public class Message : Entity
{
    public Guid ConversationId { get; set; }
    public Conversation? Conversation { get; set; }
    public MessageRole Role { get; set; }
    public string Content { get; set; } = "";
    public string[] Sources { get; set; } = Array.Empty<string>();
    public Guid? AiModelId { get; set; }
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public decimal Cost { get; set; }
    public List<Artifact> Artifacts { get; set; } = new();
}

public class Artifact : Entity
{
    public Guid ConversationId { get; set; }
    public Guid MessageId { get; set; }
    public Message? Message { get; set; }
    public string Title { get; set; } = "";
    public string Type { get; set; } = "markdown";     // markdown | html | code | svg
    public List<ArtifactVersion> Versions { get; set; } = new();
}

public class ArtifactVersion : Entity
{
    public Guid ArtifactId { get; set; }
    public Artifact? Artifact { get; set; }
    public int Version { get; set; }
    public string Content { get; set; } = "";
}

public class UsageRecord : Entity
{
    public Guid? UserId { get; set; }
    public Guid? AgentId { get; set; }
    public Guid? AiModelId { get; set; }
    public UsageKind Kind { get; set; }
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public decimal Cost { get; set; }
}

public class Voice : Entity, ISoftDeletable
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string Language { get; set; } = "en";
    public string ProviderVoiceId { get; set; } = "";
    public int DurationSeconds { get; set; }
    public DateTime ConsentGivenAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class MediaJob : Entity
{
    public Guid UserId { get; set; }
    public MediaKind Kind { get; set; }
    public string Prompt { get; set; } = "";
    public string Style { get; set; } = "realistic";
    public int DurationSeconds { get; set; } = 5;
    public string AspectRatio { get; set; } = "16:9";
    public string? InputFilePath { get; set; }
    public JobStatus Status { get; set; } = JobStatus.Queued;
    public int Progress { get; set; }
    public string? ResultUrl { get; set; }
    public string? Error { get; set; }
    public decimal EstimatedCost { get; set; }
}
