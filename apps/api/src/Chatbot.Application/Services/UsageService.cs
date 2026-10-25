using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
namespace Chatbot.Application.Services;

public sealed class UsageService(IAppDbContext db, IOptions<AppOptions> opts)
{
    public async Task<UsageSummaryDto> SummaryAsync(CancellationToken ct)
    {
        var total = await db.UsageRecords.CountAsync(ct);
        var cost = await db.UsageRecords.SumAsync(u => (decimal?)u.Cost, ct) ?? 0;
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var media = await db.MediaJobs.CountAsync(j => j.CreatedAt >= monthStart, ct);
        var byModel = await db.UsageRecords.Where(u => u.AiModelId != null)
            .GroupBy(u => u.AiModelId).Select(g => new { Id = g.Key, N = g.Count(), C = g.Sum(x => x.Cost) }).ToListAsync(ct);
        var names = await db.AiModels.IgnoreQueryFilters().ToDictionaryAsync(m => m.Id, m => m.DisplayName, ct);
        return new(total, cost, media, opts.Value.MediaMonthlyQuota,
            byModel.Select(x => new UsageByModelDto(names.GetValueOrDefault(x.Id!.Value, "Unknown"), x.N, x.C)).OrderByDescending(x => x.Requests).ToList());
    }
}
