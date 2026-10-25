using Chatbot.Api.Infrastructure;
using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Chatbot.Application.Services;
using Chatbot.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace Chatbot.Api.Controllers;

[ApiController, Route("api/auth")]
public class AuthController(AuthService auth) : ControllerBase
{
    [HttpGet("status")] public async Task<object> Status(CancellationToken ct) => new { registration = await auth.RegistrationOpenAsync(ct) };
    [HttpPost("register"), EnableRateLimiting("auth")] public Task<AuthResponse> Register(RegisterRequest r, CancellationToken ct) => auth.RegisterAsync(r, ct);
    [HttpPost("login"), EnableRateLimiting("auth")] public Task<AuthResponse> Login(LoginRequest r, CancellationToken ct) => auth.LoginAsync(r, ct);
    [Authorize, HttpGet("me")] public object Me(ICurrentUser u) => new { id = u.Id, admin = u.IsAdmin };
}

[ApiController, Authorize(Policy = "Admin"), Route("api/models")]
public class ModelsController(AiModelService svc) : ControllerBase
{
    [HttpGet] public Task<List<ModelDto>> List(CancellationToken ct) => svc.ListAsync(ct);
    [HttpPost] public Task<ModelDto> Create(ModelRequest r, CancellationToken ct) => svc.CreateAsync(r, ct);
    [HttpPut("{id:guid}")] public Task<ModelDto> Update(Guid id, ModelRequest r, CancellationToken ct) => svc.UpdateAsync(id, r, ct);
    [HttpDelete("{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await svc.DeleteAsync(id, ct); return NoContent(); }
    [HttpPost("{id:guid}/test")] public Task<ModelTestResult> Test(Guid id, CancellationToken ct) => svc.TestAsync(id, ct);
}

[ApiController, Authorize, Route("api/agents")]
public class AgentsController(AgentService agents, KnowledgeService knowledge, ICurrentUser user) : ControllerBase
{
    [HttpGet] public Task<List<AgentDto>> List(CancellationToken ct) => agents.ListAsync(user.IsAdmin, ct);
    [HttpGet("{id:guid}")] public Task<AgentDto> Get(Guid id, CancellationToken ct) => agents.GetAsync(id, ct);
    [Authorize(Policy = "Admin"), HttpPost] public Task<AgentDto> Create(AgentRequest r, CancellationToken ct) => agents.CreateAsync(r, ct);
    [Authorize(Policy = "Admin"), HttpPut("{id:guid}")] public Task<AgentDto> Update(Guid id, AgentRequest r, CancellationToken ct) => agents.UpdateAsync(id, r, ct);
    [Authorize(Policy = "Admin"), HttpDelete("{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await agents.DeleteAsync(id, ct); return NoContent(); }

    [Authorize(Policy = "Admin"), HttpGet("{id:guid}/documents")] public Task<List<DocumentDto>> Docs(Guid id, CancellationToken ct) => knowledge.ListAsync(id, ct);
    [Authorize(Policy = "Admin"), HttpPost("{id:guid}/documents"), RequestSizeLimit(60_000_000)]
    public async Task<List<UploadResultDto>> Upload(Guid id, List<IFormFile> files, CancellationToken ct)
    {
        var res = new List<UploadResultDto>();
        foreach (var f in files.Take(10))
        {
            if (f.Length > 15_000_000) { res.Add(new(f.FileName, false, "File is larger than 15 MB.")); continue; }
            await using var s = f.OpenReadStream();
            res.Add(await knowledge.AddAsync(id, s, f.FileName, ct));
        }
        return res;
    }
}

[ApiController, Authorize(Policy = "Admin"), Route("api/documents")]
public class DocumentsController(KnowledgeService knowledge) : ControllerBase
{
    [HttpDelete("{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await knowledge.DeleteAsync(id, ct); return NoContent(); }
}

[ApiController, Authorize, Route("api")]
public class ChatController(ChatService chat, ConversationService convos, ArtifactService artifacts, ICurrentUser user) : ControllerBase
{
    [HttpPost("chat")] public Task<ChatReplyDto> Send(SendMessageRequest r, CancellationToken ct) => chat.SendAsync(user.Id, r, ct);
    [HttpGet("conversations")] public Task<List<ConversationDto>> List([FromQuery] Guid? agentId, CancellationToken ct) => convos.ListAsync(user.Id, agentId, ct);
    [HttpGet("conversations/{id:guid}/messages")] public Task<List<MessageDto>> Messages(Guid id, CancellationToken ct) => convos.MessagesAsync(id, user.Id, ct);
    [HttpDelete("conversations/{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await convos.DeleteAsync(id, user.Id, ct); return NoContent(); }

    [HttpGet("artifacts/{id:guid}")] public Task<ArtifactDto> Artifact(Guid id, CancellationToken ct) => artifacts.GetAsync(id, user.Id, user.IsAdmin, ct);
    [HttpPost("artifacts/{id:guid}/revise")] public Task<ArtifactDto> Revise(Guid id, ReviseArtifactRequest r, CancellationToken ct) => artifacts.ReviseAsync(id, user.Id, user.IsAdmin, r.Instruction, ct);

    [Authorize(Policy = "Admin"), HttpGet("admin/conversations")] public Task<List<ConversationDto>> AdminList([FromQuery] Guid? agentId, CancellationToken ct) => convos.ListAsync(null, agentId, ct);
    [Authorize(Policy = "Admin"), HttpGet("admin/conversations/{id:guid}/messages")] public Task<List<MessageDto>> AdminMessages(Guid id, CancellationToken ct) => convos.MessagesAsync(id, null, ct);
}

[ApiController, AllowAnonymous, Microsoft.AspNetCore.Cors.EnableCors("public"), Route("api/public/{slug}")]
public class PublicController(ChatService chat) : ControllerBase
{
    [HttpGet] public Task<PublicAgentDto> Info(string slug, CancellationToken ct) => chat.GetPublicAsync(slug, ct);
    [HttpPost("chat"), EnableRateLimiting("public-chat")] public Task<ChatReplyDto> Chat(string slug, PublicChatRequest r, CancellationToken ct) => chat.SendPublicAsync(slug, r, ct);
}

[ApiController, Authorize(Policy = "Admin"), Route("api/usage")]
public class UsageController(UsageService usage) : ControllerBase
{
    [HttpGet] public Task<UsageSummaryDto> Summary(CancellationToken ct) => usage.SummaryAsync(ct);
}

[ApiController, Authorize, Route("api/media")]
public class MediaController(MediaService media, ICurrentUser user) : ControllerBase
{
    [HttpGet("jobs")] public Task<List<MediaJobDto>> List(CancellationToken ct) => media.ListAsync(user.Id, ct);
    [HttpGet("estimate")] public EstimateDto Estimate([FromQuery] MediaKind kind, [FromQuery] int seconds = 5) => media.Estimate(kind, seconds);
    [HttpPost("jobs"), RequestSizeLimit(20_000_000)]
    public async Task<MediaJobDto> Create([FromForm] CreateMediaJobRequest r, IFormFile? file, CancellationToken ct)
    {
        await using var s = file?.OpenReadStream();
        return await media.CreateAsync(user.Id, r, s, file?.FileName, ct);
    }
}

[ApiController, Authorize, Route("api")]
public class VoiceController(VoiceService voices, ICurrentUser user) : ControllerBase
{
    [HttpGet("voices")] public Task<List<VoiceDto>> List(CancellationToken ct) => voices.ListAsync(user.Id, ct);
    [HttpPost("voices"), RequestSizeLimit(30_000_000)]
    public async Task<VoiceDto> Clone([FromForm] string name, [FromForm] string language, [FromForm] bool consent, [FromForm] int seconds, IFormFile file, CancellationToken ct)
    {
        await using var s = file.OpenReadStream();
        return await voices.CloneAsync(user.Id, name, language, consent, s, seconds, ct);
    }
    [HttpDelete("voices/{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await voices.DeleteAsync(user.Id, id, ct); return NoContent(); }

    [HttpPost("speech/stt"), RequestSizeLimit(25_000_000)]
    public async Task<SttResult> Stt(IFormFile file, CancellationToken ct)
    {
        await using var s = file.OpenReadStream();
        return await voices.TranscribeAsync(user.Id, s, file.FileName, ct);
    }
    [HttpPost("speech/tts")]
    public async Task<IActionResult> Tts(TtsRequest r, CancellationToken ct) => File(await voices.SynthesizeAsync(user.Id, r, ct), "audio/mpeg");
}
