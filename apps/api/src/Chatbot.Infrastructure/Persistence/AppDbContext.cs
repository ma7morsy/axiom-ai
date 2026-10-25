using Chatbot.Application.Abstractions;
using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;
namespace Chatbot.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<AiModel> AiModels => Set<AiModel>();
    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentChunk> DocumentChunks => Set<DocumentChunk>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Artifact> Artifacts => Set<Artifact>();
    public DbSet<ArtifactVersion> ArtifactVersions => Set<ArtifactVersion>();
    public DbSet<UsageRecord> UsageRecords => Set<UsageRecord>();
    public DbSet<Voice> Voices => Set<Voice>();
    public DbSet<MediaJob> MediaJobs => Set<MediaJob>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
        });
        b.Entity<AiModel>(e =>
        {
            e.Property(x => x.Provider).HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.InputPricePer1K).HasPrecision(12, 6);
            e.Property(x => x.OutputPricePer1K).HasPrecision(12, 6);
            e.HasIndex(x => new { x.IsActive, x.Priority });
            e.HasQueryFilter(x => x.DeletedAt == null);
        });
        b.Entity<Agent>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasOne(x => x.PreferredModel).WithMany().HasForeignKey(x => x.PreferredModelId).OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(x => x.DeletedAt == null);
        });
        b.Entity<Document>(e =>
        {
            e.HasOne(x => x.Agent).WithMany(a => a.Documents).HasForeignKey(x => x.AgentId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.AgentId, x.FileName });
            e.HasQueryFilter(x => x.DeletedAt == null);
        });
        b.Entity<DocumentChunk>(e =>
        {
            e.HasOne(x => x.Document).WithMany(d => d.Chunks).HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.AgentId);
            e.HasQueryFilter(x => x.Document!.DeletedAt == null);
        });
        b.Entity<Conversation>(e =>
        {
            e.HasOne(x => x.Agent).WithMany().HasForeignKey(x => x.AgentId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.UpdatedAt });
            e.HasIndex(x => new { x.AgentId, x.SessionId });
            e.Property(x => x.SessionId).HasMaxLength(64);
            e.HasQueryFilter(x => x.DeletedAt == null);
        });
        b.Entity<Message>(e =>
        {
            e.HasOne(x => x.Conversation).WithMany(c => c.Messages).HasForeignKey(x => x.ConversationId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.ConversationId, x.CreatedAt });
            e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Cost).HasPrecision(12, 6);
            e.HasQueryFilter(x => x.Conversation!.DeletedAt == null);
        });
        b.Entity<Artifact>(e =>
        {
            e.HasOne(x => x.Message).WithMany(m => m.Artifacts).HasForeignKey(x => x.MessageId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.ConversationId);
        });
        b.Entity<ArtifactVersion>(e =>
        {
            e.HasOne(x => x.Artifact).WithMany(a => a.Versions).HasForeignKey(x => x.ArtifactId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.ArtifactId, x.Version }).IsUnique();
        });
        b.Entity<UsageRecord>(e =>
        {
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Cost).HasPrecision(12, 6);
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.AiModelId);
        });
        b.Entity<Voice>(e =>
        {
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.UserId);
            e.HasQueryFilter(x => x.DeletedAt == null);
        });
        b.Entity<MediaJob>(e =>
        {
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.EstimatedCost).HasPrecision(12, 4);
            e.HasIndex(x => new { x.Status, x.CreatedAt });
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var e in ChangeTracker.Entries<Entity>().Where(e => e.State == EntityState.Modified)) e.Entity.UpdatedAt = DateTime.UtcNow;
        return base.SaveChangesAsync(ct);
    }

    public async Task<T> InTransactionAsync<T>(Func<Task<T>> work, CancellationToken ct = default)
    {
        if (Database.CurrentTransaction is not null) return await work();
        await using var tx = await Database.BeginTransactionAsync(ct);
        var result = await work();
        await tx.CommitAsync(ct);
        return result;
    }
}
