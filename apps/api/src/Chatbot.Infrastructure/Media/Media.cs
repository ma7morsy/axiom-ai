using System.Text;
using Chatbot.Application.Abstractions;
using Chatbot.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Chatbot.Infrastructure.Persistence;
namespace Chatbot.Infrastructure.Media;

public sealed class LocalFileStorage(IConfiguration cfg) : IFileStorage
{
    public static string Root(IConfiguration c) => Path.GetFullPath(c["Storage:Path"] ?? "storage");
    public async Task<string> SaveAsync(Stream content, string extension, CancellationToken ct)
    {
        var dir = Root(cfg); Directory.CreateDirectory(dir);
        var name = Guid.NewGuid().ToString("N") + (extension.StartsWith('.') ? extension : "." + extension);
        await using var fs = File.Create(Path.Combine(dir, name));
        await content.CopyToAsync(fs, ct);
        return "/files/" + name;
    }
}

/// <summary>
/// PLACEHOLDER generator: simulates progress so the UI works end to end.
/// Replace with a real provider (Runway, Luma, Kling, Veo, Higgsfield...) by implementing IMediaGenerator and returning the file URL.
/// </summary>
public sealed class SimulatedMediaGenerator : IMediaGenerator
{
    public async Task<string> GenerateAsync(MediaJob job, Func<int, Task> progress, CancellationToken ct)
    {
        for (var p = 20; p <= 100; p += 20) { await Task.Delay(1000, ct); await progress(p); }
        return "simulated://" + job.Id;
    }
}

/// <summary>PLACEHOLDER voice cloning. Implement IVoiceCloneProvider for ElevenLabs, Cartesia, etc.</summary>
public sealed class SimulatedVoiceCloneProvider : IVoiceCloneProvider
{
    public Task<string> CloneAsync(string name, string language, Stream sample, CancellationToken ct) => Task.FromResult("simulated-" + Guid.NewGuid().ToString("N"));
    public Task DeleteAsync(string providerVoiceId, CancellationToken ct) => Task.CompletedTask;
}

public sealed class MediaJobWorker(IServiceScopeFactory scopes, ILogger<MediaJobWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        while (!stop.IsCancellationRequested)
        {
            try { if (!await ProcessNextAsync(stop)) await Task.Delay(2000, stop); }
            catch (OperationCanceledException) { break; }
            catch (Exception e) { log.LogError(e, "Media worker error"); await Task.Delay(5000, stop); }
        }
    }

    async Task<bool> ProcessNextAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var job = await db.MediaJobs.Where(j => j.Status == JobStatus.Queued).OrderBy(j => j.CreatedAt).FirstOrDefaultAsync(ct);
        if (job is null) return false;
        job.Status = JobStatus.Running; await db.SaveChangesAsync(ct);
        try
        {
            var gen = scope.ServiceProvider.GetRequiredService<IMediaGenerator>();
            job.ResultUrl = await gen.GenerateAsync(job, async p => { job.Progress = p; await db.SaveChangesAsync(ct); }, ct);
            job.Status = JobStatus.Done; job.Progress = 100;
            db.UsageRecords.Add(new UsageRecord { UserId = job.UserId, Kind = job.Kind == MediaKind.Image ? UsageKind.Image : UsageKind.Video, Cost = job.EstimatedCost });
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            log.LogError(e, "Media job {Id} failed", job.Id);
            job.Status = JobStatus.Failed; job.Error = "Generation failed. Please try again.";
        }
        await db.SaveChangesAsync(ct);
        return true;
    }
}
