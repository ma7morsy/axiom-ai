using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;

namespace Chatbot.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<AiModel> AiModels { get; }
    DbSet<Agent> Agents { get; }
    DbSet<Document> Documents { get; }
    DbSet<DocumentChunk> DocumentChunks { get; }
    DbSet<Conversation> Conversations { get; }
    DbSet<Message> Messages { get; }
    DbSet<Artifact> Artifacts { get; }
    DbSet<ArtifactVersion> ArtifactVersions { get; }
    DbSet<UsageRecord> UsageRecords { get; }
    DbSet<Voice> Voices { get; }
    DbSet<MediaJob> MediaJobs { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task<T> InTransactionAsync<T>(Func<Task<T>> work, CancellationToken ct = default);
}

public interface ICurrentUser { Guid Id { get; } bool IsAdmin { get; } }
public interface ISecretProtector { string Protect(string plain); string Unprotect(string cipher); }
public interface IPasswordHasher { string Hash(string password); bool Verify(string password, string hash); }
public interface ITokenService { string Create(User user); }

public record ChatTurn(string Role, string Content);
public record ChatCompletion(string Text, int PromptTokens, int CompletionTokens);
public record ModelConnection(string ModelName, string BaseUrl, string ApiKey);
public class ChunkHit { public string DocumentName { get; set; } = ""; public string Content { get; set; } = ""; public float Rank { get; set; } }

/// <summary>Strategy: one implementation per provider API style.</summary>
public interface IChatProvider
{
    ProviderType Type { get; }
    Task<ChatCompletion> CompleteAsync(ModelConnection c, string system, IReadOnlyList<ChatTurn> turns, int maxTokens, CancellationToken ct);
}
public interface IChatProviderFactory { IChatProvider For(ProviderType type); }
public interface ISpeechProvider
{
    Task<string> TranscribeAsync(ModelConnection c, Stream audio, string fileName, CancellationToken ct);
    Task<byte[]> SynthesizeAsync(ModelConnection c, string text, string voice, double speed, CancellationToken ct);
}
public interface IKnowledgeSearch { Task<IReadOnlyList<ChunkHit>> SearchAsync(Guid agentId, string query, int limit, CancellationToken ct); }
public interface IDocumentTextExtractor { Task<string> ExtractAsync(Stream content, string fileName, CancellationToken ct); }
public interface IFileStorage { Task<string> SaveAsync(Stream content, string extension, CancellationToken ct); }
public interface IMediaGenerator { Task<string> GenerateAsync(MediaJob job, Func<int, Task> progress, CancellationToken ct); }
public interface IVoiceCloneProvider
{
    Task<string> CloneAsync(string name, string language, Stream sample, CancellationToken ct);
    Task DeleteAsync(string providerVoiceId, CancellationToken ct);
}
