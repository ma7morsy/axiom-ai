using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
namespace Chatbot.Application.Services;

public sealed class ChatService(IAppDbContext db, IChatRouter router, IKnowledgeSearch search, IOptions<AppOptions> opts)
{
    public async Task<ChatReplyDto> SendAsync(Guid userId, SendMessageRequest r, CancellationToken ct)
    {
        var agent = await db.Agents.FirstOrDefaultAsync(a => a.Id == r.AgentId && a.IsLive, ct) ?? throw new NotFoundException("Agent not found.");
        Conversation? conv = null;
        if (r.ConversationId is Guid cid)
            conv = await db.Conversations.FirstOrDefaultAsync(c => c.Id == cid && c.UserId == userId, ct) ?? throw new NotFoundException("Conversation not found.");
        if (conv is null) { conv = new Conversation { AgentId = agent.Id, UserId = userId }; db.Conversations.Add(conv); }
        return await RunAsync(agent, conv, userId, r.Message.Trim(), ct);
    }

    public async Task<PublicAgentDto> GetPublicAsync(string slug, CancellationToken ct)
    {
        var a = await db.Agents.FirstOrDefaultAsync(x => x.Slug == slug && x.IsLive, ct) ?? throw new NotFoundException("This assistant is not available.");
        return new(a.Name, a.Welcome);
    }

    public async Task<ChatReplyDto> SendPublicAsync(string slug, PublicChatRequest r, CancellationToken ct)
    {
        var agent = await db.Agents.FirstOrDefaultAsync(a => a.Slug == slug && a.IsLive, ct) ?? throw new NotFoundException("This assistant is not available.");
        var conv = await db.Conversations.FirstOrDefaultAsync(c => c.AgentId == agent.Id && c.SessionId == r.Session, ct);
        if (conv is null) { conv = new Conversation { AgentId = agent.Id, SessionId = r.Session }; db.Conversations.Add(conv); }
        return await RunAsync(agent, conv, null, r.Message.Trim(), ct);
    }

    async Task<ChatReplyDto> RunAsync(Agent agent, Conversation conv, Guid? userId, string message, CancellationToken ct)
    {
        var history = await db.Messages.Where(m => m.ConversationId == conv.Id).OrderByDescending(m => m.CreatedAt).Take(8).ToListAsync(ct);
        history.Reverse();
        var turns = ChatTurns.Normalize(history.Select(h => new ChatTurn(h.Role == MessageRole.User ? "user" : "assistant", h.Content))
            .Append(new ChatTurn("user", message)));

        var models = await PickModelsAsync(agent, ct);
        var (context, sources) = await BuildContextAsync(agent, models, turns, message, ct);
        var routed = await router.CompleteAsync(models, Prompts.Agent(agent.Name, agent.Instructions, context), turns, 1500, ct);
        var (text, parsed) = ArtifactParser.Extract(routed.Completion.Text);
        if (text.Length == 0) text = parsed.Count > 0 ? parsed[0].Title : "…";

        var now = DateTime.UtcNow;
        if (string.IsNullOrEmpty(conv.Title)) conv.Title = message.Length > 60 ? message[..60] : message;
        conv.UpdatedAt = now;
        var userMsg = new Message { ConversationId = conv.Id, Role = MessageRole.User, Content = message, CreatedAt = now };
        var cost = CostEstimator.Chat(routed.Model, routed.Completion.PromptTokens, routed.Completion.CompletionTokens);
        var reply = new Message
        {
            ConversationId = conv.Id, Role = MessageRole.Assistant, Content = text, Sources = sources, AiModelId = routed.Model.Id, CreatedAt = now.AddMilliseconds(1),
            PromptTokens = routed.Completion.PromptTokens, CompletionTokens = routed.Completion.CompletionTokens, Cost = cost
        };
        foreach (var p in parsed)
        {
            var art = new Artifact { ConversationId = conv.Id, MessageId = reply.Id, Title = p.Title, Type = p.Type };
            art.Versions.Add(new ArtifactVersion { Version = 1, Content = p.Content });
            reply.Artifacts.Add(art);
        }
        db.Messages.AddRange(userMsg, reply);
        db.UsageRecords.Add(new UsageRecord { UserId = userId, AgentId = agent.Id, AiModelId = routed.Model.Id, Kind = UsageKind.Chat,
            PromptTokens = reply.PromptTokens, CompletionTokens = reply.CompletionTokens, Cost = cost });
        await db.SaveChangesAsync(ct);
        return new(conv.Id, reply.ToDto(routed.Model.DisplayName));
    }

    async Task<List<AiModel>> PickModelsAsync(Agent agent, CancellationToken ct)
    {
        var all = await db.AiModels.Where(m => m.IsActive && (m.Capabilities & Capability.Text) != 0).OrderBy(m => m.Priority).ToListAsync(ct);
        if (agent.PreferredModelId is Guid pid)
        {
            var pref = all.FirstOrDefault(m => m.Id == pid);
            if (pref is not null) { all.Remove(pref); all.Insert(0, pref); }
        }
        return all;
    }

    /// <summary>Small knowledge bases go to the model whole; larger ones use intent rewrite + full-text retrieval.</summary>
    async Task<(string Context, string[] Sources)> BuildContextAsync(Agent agent, List<AiModel> models, List<ChatTurn> turns, string message, CancellationToken ct)
    {
        var total = await db.Documents.Where(d => d.AgentId == agent.Id).SumAsync(d => (int?)d.Characters, ct) ?? 0;
        if (total <= opts.Value.FullContextCharLimit)
        {
            var docs = await db.Documents.Where(d => d.AgentId == agent.Id).Select(d => new { d.FileName, d.Text }).ToListAsync(ct);
            return (string.Join("\n\n", docs.Select(d => $"### {d.FileName}\n{d.Text}")), []);
        }
        var query = message;
        try { query = (await router.CompleteAsync(models, Prompts.Rewrite, turns, 120, ct)).Completion.Text; } catch (ProviderException) { }
        var hits = await search.SearchAsync(agent.Id, query + " " + message, 8, ct);
        return (string.Join("\n\n", hits.Select(h => $"### {h.DocumentName}\n{h.Content}")), hits.Select(h => h.DocumentName).Distinct().ToArray());
    }
}
