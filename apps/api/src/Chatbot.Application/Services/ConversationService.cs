using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Microsoft.EntityFrameworkCore;
namespace Chatbot.Application.Services;

public sealed class ConversationService(IAppDbContext db)
{
    public async Task<List<ConversationDto>> ListAsync(Guid? userId, Guid? agentId, CancellationToken ct)
    {
        var q = db.Conversations.AsQueryable();
        if (userId is Guid u) q = q.Where(c => c.UserId == u);
        if (agentId is Guid a) q = q.Where(c => c.AgentId == a);
        return await q.OrderByDescending(c => c.UpdatedAt).Take(200)
            .Select(c => new ConversationDto(c.Id, c.AgentId, c.Agent!.Name, c.Title, c.UpdatedAt, c.Messages.Count)).ToListAsync(ct);
    }

    public async Task<List<MessageDto>> MessagesAsync(Guid id, Guid? userId, CancellationToken ct)
    {
        var owned = await db.Conversations.AnyAsync(c => c.Id == id && (userId == null || c.UserId == userId), ct);
        if (!owned) throw new NotFoundException("Conversation not found.");
        var msgs = await db.Messages.Where(m => m.ConversationId == id).Include(m => m.Artifacts).ThenInclude(a => a.Versions).OrderBy(m => m.CreatedAt).ToListAsync(ct);
        return msgs.Select(m => m.ToDto()).ToList();
    }

    public async Task DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var c = await db.Conversations.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct) ?? throw new NotFoundException("Conversation not found.");
        c.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}
