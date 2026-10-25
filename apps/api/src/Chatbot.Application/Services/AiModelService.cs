using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;
namespace Chatbot.Application.Services;

public sealed class AiModelService(IAppDbContext db, ISecretProtector protector, IChatRouter router)
{
    public async Task<List<ModelDto>> ListAsync(CancellationToken ct) =>
        (await db.AiModels.OrderBy(m => m.Priority).ThenBy(m => m.DisplayName).ToListAsync(ct)).Select(m => m.ToDto()).ToList();

    public async Task<ModelDto> CreateAsync(ModelRequest r, CancellationToken ct)
    {
        var m = new AiModel();
        Apply(m, r);
        db.AiModels.Add(m);
        await db.SaveChangesAsync(ct);
        return m.ToDto();
    }

    public async Task<ModelDto> UpdateAsync(Guid id, ModelRequest r, CancellationToken ct)
    {
        var m = await db.AiModels.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Model not found.");
        Apply(m, r);
        await db.SaveChangesAsync(ct);
        return m.ToDto();
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var m = await db.AiModels.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Model not found.");
        m.DeletedAt = DateTime.UtcNow; m.IsActive = false;
        await db.SaveChangesAsync(ct);
    }

    public async Task<ModelTestResult> TestAsync(Guid id, CancellationToken ct)
    {
        var m = await db.AiModels.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Model not found.");
        try
        {
            var r = await router.CompleteAsync([m], "Reply with the single word OK.", [new ChatTurn("user", "ping")], 16, ct);
            return new(true, $"Connected. Reply: {r.Completion.Text.Trim()[..Math.Min(40, r.Completion.Text.Trim().Length)]}");
        }
        catch (ProviderException e) { return new(false, e.InnerException?.Message ?? e.Message); }
    }

    void Apply(AiModel m, ModelRequest r)
    {
        m.DisplayName = r.DisplayName.Trim(); m.Provider = r.Provider; m.ModelName = r.ModelName.Trim();
        m.BaseUrl = string.IsNullOrWhiteSpace(r.BaseUrl) ? m.BaseUrl : r.BaseUrl.Trim();
        if (r.Provider == ProviderType.OpenAiCompatible && string.IsNullOrWhiteSpace(m.BaseUrl)) m.BaseUrl = "https://api.openai.com/v1";
        if (!string.IsNullOrWhiteSpace(r.ApiKey)) m.ApiKeyEncrypted = protector.Protect(r.ApiKey.Trim());
        m.Priority = r.Priority; m.Capabilities = CapabilityMap.Parse(r.Capabilities);
        m.InputPricePer1K = r.InputPricePer1K; m.OutputPricePer1K = r.OutputPricePer1K; m.IsActive = r.IsActive;
    }
}
