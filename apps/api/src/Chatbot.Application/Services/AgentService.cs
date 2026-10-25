using System.Security.Cryptography;
using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;
namespace Chatbot.Application.Services;

public sealed class AgentService(IAppDbContext db)
{
    public async Task<List<AgentDto>> ListAsync(bool adminView, CancellationToken ct)
    {
        var q = db.Agents.AsQueryable();
        if (!adminView) q = q.Where(a => a.IsLive);
        var agents = await q.OrderBy(a => a.Name).ToListAsync(ct);
        var counts = await db.Documents.GroupBy(d => d.AgentId).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N, ct);
        return agents.Select(a => a.ToDto(counts.GetValueOrDefault(a.Id))).ToList();
    }

    public async Task<AgentDto> GetAsync(Guid id, CancellationToken ct)
    {
        var a = await db.Agents.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Agent not found.");
        return a.ToDto(await db.Documents.CountAsync(d => d.AgentId == id, ct));
    }

    public async Task<AgentDto> CreateAsync(AgentRequest r, CancellationToken ct)
    {
        var a = new Agent { Slug = Convert.ToHexString(RandomNumberGenerator.GetBytes(6)).ToLowerInvariant() };
        Apply(a, r);
        db.Agents.Add(a);
        await db.SaveChangesAsync(ct);
        return a.ToDto(0);
    }

    public async Task<AgentDto> UpdateAsync(Guid id, AgentRequest r, CancellationToken ct)
    {
        var a = await db.Agents.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Agent not found.");
        Apply(a, r);
        await db.SaveChangesAsync(ct);
        return a.ToDto(await db.Documents.CountAsync(d => d.AgentId == id, ct));
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var a = await db.Agents.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Agent not found.");
        a.DeletedAt = DateTime.UtcNow; a.IsLive = false;
        await db.SaveChangesAsync(ct);
    }

    static void Apply(Agent a, AgentRequest r)
    {
        a.Name = r.Name.Trim(); a.Description = r.Description?.Trim() ?? "";
        a.Welcome = r.Welcome?.Trim() ?? "Hi! How can I help you today?"; a.Instructions = r.Instructions?.Trim() ?? "";
        a.IsLive = r.IsLive; a.PreferredModelId = r.PreferredModelId;
    }
}
