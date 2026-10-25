using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;
namespace Chatbot.Application.Services;

public sealed class ArtifactService(IAppDbContext db, IChatRouter router)
{
    public async Task<ArtifactDto> GetAsync(Guid id, Guid userId, bool admin, CancellationToken ct) => (await LoadAsync(id, userId, admin, ct)).ToDto();

    public async Task<ArtifactDto> ReviseAsync(Guid id, Guid userId, bool admin, string instruction, CancellationToken ct)
    {
        var art = await LoadAsync(id, userId, admin, ct);
        var latest = art.Versions.OrderByDescending(v => v.Version).First();
        var models = await db.AiModels.Where(m => m.IsActive && (m.Capabilities & Capability.Text) != 0).OrderBy(m => m.Priority).ToListAsync(ct);
        var routed = await router.CompleteAsync(models, Prompts.Revise,
            [new ChatTurn("user", $"CURRENT CONTENT:\n{latest.Content}\n\nINSTRUCTION:\n{instruction}")], 2500, ct);
        var next = new ArtifactVersion { ArtifactId = art.Id, Version = latest.Version + 1, Content = routed.Completion.Text.Trim() };
        db.ArtifactVersions.Add(next);
        db.UsageRecords.Add(new UsageRecord { UserId = userId, AiModelId = routed.Model.Id, Kind = UsageKind.Chat,
            PromptTokens = routed.Completion.PromptTokens, CompletionTokens = routed.Completion.CompletionTokens,
            Cost = CostEstimator.Chat(routed.Model, routed.Completion.PromptTokens, routed.Completion.CompletionTokens) });
        await db.SaveChangesAsync(ct);
        return new(art.Id, art.Title, art.Type, next.Version, next.Content);
    }

    async Task<Artifact> LoadAsync(Guid id, Guid userId, bool admin, CancellationToken ct)
    {
        var art = await db.Artifacts.Include(a => a.Versions).FirstOrDefaultAsync(a => a.Id == id, ct) ?? throw new NotFoundException("Artifact not found.");
        var ok = admin || await db.Conversations.AnyAsync(c => c.Id == art.ConversationId && c.UserId == userId, ct);
        return ok ? art : throw new NotFoundException("Artifact not found.");
    }
}
