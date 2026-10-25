using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
namespace Chatbot.Application.Services;

public sealed class MediaService(IAppDbContext db, IFileStorage storage, IOptions<AppOptions> opts)
{
    public async Task<List<MediaJobDto>> ListAsync(Guid userId, CancellationToken ct) =>
        (await db.MediaJobs.Where(j => j.UserId == userId).OrderByDescending(j => j.CreatedAt).Take(50).ToListAsync(ct)).Select(j => j.ToDto()).ToList();

    public EstimateDto Estimate(MediaKind kind, int seconds) => new(CostEstimator.Media(kind, seconds));

    public async Task<MediaJobDto> CreateAsync(Guid userId, CreateMediaJobRequest r, Stream? input, string? inputName, CancellationToken ct)
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var used = await db.MediaJobs.CountAsync(j => j.UserId == userId && j.CreatedAt >= monthStart, ct);
        if (used >= opts.Value.MediaMonthlyQuota) throw new ForbiddenException("Monthly media quota reached.");
        if (r.Kind == MediaKind.ImageToVideo && input is null) throw new BadRequestException("Upload an image for image-to-video.");

        string? path = null;
        if (input is not null) path = await storage.SaveAsync(input, Path.GetExtension(inputName ?? ".png"), ct);
        var job = new MediaJob
        {
            UserId = userId, Kind = r.Kind, Prompt = r.Prompt.Trim(), Style = r.Style ?? "realistic", DurationSeconds = r.Kind == MediaKind.Image ? 0 : r.DurationSeconds,
            AspectRatio = r.AspectRatio ?? "16:9", InputFilePath = path, EstimatedCost = CostEstimator.Media(r.Kind, r.DurationSeconds)
        };
        db.MediaJobs.Add(job);
        await db.SaveChangesAsync(ct);   // the background worker picks up Queued jobs
        return job.ToDto();
    }
}
