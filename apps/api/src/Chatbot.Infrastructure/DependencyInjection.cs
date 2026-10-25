using Chatbot.Application.Abstractions;
using Chatbot.Infrastructure.Media;
using Chatbot.Infrastructure.Persistence;
using Chatbot.Infrastructure.Providers;
using Chatbot.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
namespace Chatbot.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection s, IConfiguration cfg)
    {
        s.AddDbContext<AppDbContext>(o => o.UseNpgsql(NormalizeConnectionString(cfg.GetConnectionString("Default"))));
        s.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        s.AddScoped<IKnowledgeSearch, KnowledgeSearch>();

        s.Configure<JwtOptions>(cfg.GetSection("Jwt"));
        s.Configure<SecurityOptions>(cfg.GetSection("Security"));
        s.AddSingleton<ISecretProtector, SecretProtector>();
        s.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        s.AddSingleton<ITokenService, JwtTokenService>();

        s.AddHttpClient<OpenAiCompatibleProvider>(c => c.Timeout = TimeSpan.FromSeconds(60));
        s.AddHttpClient<AnthropicProvider>(c => c.Timeout = TimeSpan.FromSeconds(60));
        s.AddHttpClient<GeminiProvider>(c => c.Timeout = TimeSpan.FromSeconds(60));
        s.AddTransient<IChatProvider>(sp => sp.GetRequiredService<OpenAiCompatibleProvider>());
        s.AddTransient<IChatProvider>(sp => sp.GetRequiredService<AnthropicProvider>());
        s.AddTransient<IChatProvider>(sp => sp.GetRequiredService<GeminiProvider>());
        s.AddScoped<IChatProviderFactory, ChatProviderFactory>();
        s.AddHttpClient<ISpeechProvider, OpenAiSpeechProvider>(c => c.Timeout = TimeSpan.FromSeconds(120));

        s.AddSingleton<IDocumentTextExtractor, DocumentTextExtractor>();
        s.AddSingleton<IFileStorage, LocalFileStorage>();
        s.AddScoped<IMediaGenerator, SimulatedMediaGenerator>();
        s.AddScoped<IVoiceCloneProvider, SimulatedVoiceCloneProvider>();
        s.AddHostedService<MediaJobWorker>();
        return s;
    }

    /// <summary>Hosts like Render hand out postgres://user:pass@host/db URLs; Npgsql wants key=value pairs.</summary>
    static string? NormalizeConnectionString(string? cs)
    {
        if (string.IsNullOrWhiteSpace(cs) || !(cs.StartsWith("postgres://") || cs.StartsWith("postgresql://"))) return cs;
        var u = new Uri(cs);
        var info = u.UserInfo.Split(':', 2);
        var pass = info.Length > 1 ? Uri.UnescapeDataString(info[1]) : "";
        return $"Host={u.Host};Port={(u.Port > 0 ? u.Port : 5432)};Database={u.AbsolutePath.TrimStart('/')};Username={Uri.UnescapeDataString(info[0])};Password={pass};SSL Mode=Require;Trust Server Certificate=true";
    }
}
