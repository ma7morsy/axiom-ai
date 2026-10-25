using Chatbot.Application.Dtos;
using FluentValidation;

namespace Chatbot.Application.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Password).MinimumLength(8).MaximumLength(100);
    }
}
public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator() { RuleFor(x => x.Email).NotEmpty(); RuleFor(x => x.Password).NotEmpty(); }
}
public class ModelRequestValidator : AbstractValidator<ModelRequest>
{
    public ModelRequestValidator()
    {
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(80);
        RuleFor(x => x.ModelName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Priority).InclusiveBetween(0, 10000);
        RuleFor(x => x.BaseUrl).Must(u => string.IsNullOrWhiteSpace(u) || Uri.TryCreate(u, UriKind.Absolute, out var r) && (r.Scheme == "https" || r.Scheme == "http"))
            .WithMessage("Base URL must start with http:// or https://");
    }
}
public class AgentRequestValidator : AbstractValidator<AgentRequest>
{
    public AgentRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Welcome).MaximumLength(300);
        RuleFor(x => x.Instructions).MaximumLength(3000);
    }
}
public class SendMessageRequestValidator : AbstractValidator<SendMessageRequest>
{
    public SendMessageRequestValidator() { RuleFor(x => x.Message).NotEmpty().MaximumLength(4000); RuleFor(x => x.AgentId).NotEmpty(); }
}
public class PublicChatRequestValidator : AbstractValidator<PublicChatRequest>
{
    public PublicChatRequestValidator()
    {
        RuleFor(x => x.Message).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.Session).Matches("^[A-Za-z0-9_-]{8,64}$");
    }
}
public class TtsRequestValidator : AbstractValidator<TtsRequest>
{
    public TtsRequestValidator() { RuleFor(x => x.Text).NotEmpty().MaximumLength(4000); RuleFor(x => x.Speed).InclusiveBetween(0.5, 2.0); }
}
public class ReviseArtifactRequestValidator : AbstractValidator<ReviseArtifactRequest>
{
    public ReviseArtifactRequestValidator() { RuleFor(x => x.Instruction).NotEmpty().MaximumLength(1000); }
}
public class CreateMediaJobRequestValidator : AbstractValidator<CreateMediaJobRequest>
{
    public CreateMediaJobRequestValidator()
    {
        RuleFor(x => x.Prompt).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.DurationSeconds).InclusiveBetween(1, 30);
    }
}
