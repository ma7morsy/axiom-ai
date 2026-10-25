using Chatbot.Application.Common;
using Chatbot.Application.Services;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
namespace Chatbot.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection s, IConfiguration cfg)
    {
        s.Configure<AppOptions>(cfg.GetSection("App"));
        s.AddValidatorsFromAssemblyContaining<AppOptions>();
        s.AddScoped<IChatRouter, ChatRouter>();
        s.AddScoped<AuthService>(); s.AddScoped<AiModelService>(); s.AddScoped<AgentService>(); s.AddScoped<KnowledgeService>();
        s.AddScoped<ChatService>(); s.AddScoped<ConversationService>(); s.AddScoped<ArtifactService>();
        s.AddScoped<MediaService>(); s.AddScoped<VoiceService>(); s.AddScoped<UsageService>();
        return s;
    }
}
