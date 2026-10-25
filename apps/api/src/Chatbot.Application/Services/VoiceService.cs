using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;
namespace Chatbot.Application.Services;

public sealed class VoiceService(IAppDbContext db, IVoiceCloneProvider cloner, ISpeechProvider speech, ISecretProtector protector)
{
    public async Task<List<VoiceDto>> ListAsync(Guid userId, CancellationToken ct) =>
        (await db.Voices.Where(v => v.UserId == userId).OrderByDescending(v => v.CreatedAt).ToListAsync(ct)).Select(v => v.ToDto()).ToList();

    public async Task<VoiceDto> CloneAsync(Guid userId, string name, string language, bool consent, Stream sample, int seconds, CancellationToken ct)
    {
        if (!consent) throw new BadRequestException("You must confirm you have the right to clone this voice.");
        if (string.IsNullOrWhiteSpace(name)) throw new BadRequestException("Give the voice a name.");
        var providerId = await cloner.CloneAsync(name.Trim(), language, sample, ct);
        var v = new Voice { UserId = userId, Name = name.Trim(), Language = language, ProviderVoiceId = providerId, DurationSeconds = seconds, ConsentGivenAt = DateTime.UtcNow };
        db.Voices.Add(v);
        await db.SaveChangesAsync(ct);
        return v.ToDto();
    }

    public async Task DeleteAsync(Guid userId, Guid id, CancellationToken ct)
    {
        var v = await db.Voices.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct) ?? throw new NotFoundException("Voice not found.");
        await cloner.DeleteAsync(v.ProviderVoiceId, ct);
        v.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task<SttResult> TranscribeAsync(Guid userId, Stream audio, string fileName, CancellationToken ct)
    {
        var m = await Model(Capability.Stt, ct);
        var text = await speech.TranscribeAsync(Conn(m), audio, fileName, ct);
        db.UsageRecords.Add(new UsageRecord { UserId = userId, AiModelId = m.Id, Kind = UsageKind.Stt });
        await db.SaveChangesAsync(ct);
        return new(text);
    }

    public async Task<byte[]> SynthesizeAsync(Guid userId, TtsRequest r, CancellationToken ct)
    {
        var m = await Model(Capability.Tts, ct);
        var bytes = await speech.SynthesizeAsync(Conn(m), r.Text, r.Voice ?? "alloy", r.Speed <= 0 ? 1 : r.Speed, ct);
        db.UsageRecords.Add(new UsageRecord { UserId = userId, AiModelId = m.Id, Kind = UsageKind.Tts, PromptTokens = r.Text.Length });
        await db.SaveChangesAsync(ct);
        return bytes;
    }

    async Task<AiModel> Model(Capability c, CancellationToken ct) =>
        await db.AiModels.Where(m => m.IsActive && (m.Capabilities & c) != 0).OrderBy(m => m.Priority).FirstOrDefaultAsync(ct)
        ?? throw new BadRequestException($"No active model with the {c.ToString().ToLowerInvariant()} capability. Add one in Admin > Models.");
    ModelConnection Conn(AiModel m) => new(m.ModelName, m.BaseUrl, protector.Unprotect(m.ApiKeyEncrypted));
}
