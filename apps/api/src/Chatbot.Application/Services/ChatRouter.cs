using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Domain;
using Microsoft.Extensions.Logging;
namespace Chatbot.Application.Services;

public record RoutedCompletion(ChatCompletion Completion, AiModel Model);
public interface IChatRouter
{
    Task<RoutedCompletion> CompleteAsync(IReadOnlyList<AiModel> models, string system, IReadOnlyList<ChatTurn> turns, int maxTokens, CancellationToken ct);
}

/// <summary>Tries models in priority order and falls back to the next one when a provider fails.</summary>
public sealed class ChatRouter(IChatProviderFactory factory, ISecretProtector protector, ILogger<ChatRouter> log) : IChatRouter
{
    public async Task<RoutedCompletion> CompleteAsync(IReadOnlyList<AiModel> models, string system, IReadOnlyList<ChatTurn> turns, int maxTokens, CancellationToken ct)
    {
        if (models.Count == 0) throw new ProviderException("No active text model is configured. Add one in Admin > Models.");
        Exception? last = null;
        foreach (var m in models)
        {
            try
            {
                var conn = new ModelConnection(m.ModelName, m.BaseUrl, protector.Unprotect(m.ApiKeyEncrypted));
                return new(await factory.For(m.Provider).CompleteAsync(conn, system, turns, maxTokens, ct), m);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogWarning(e, "Model {Model} failed, trying next", m.DisplayName);
                last = e;
            }
        }
        throw new ProviderException("All configured models failed.", last);
    }
}
