using System.Security.Claims;
using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
namespace Chatbot.Api.Infrastructure;

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    ClaimsPrincipal? P => accessor.HttpContext?.User;
    public Guid Id => Guid.TryParse(P?.FindFirstValue(ClaimTypes.NameIdentifier), out var g) ? g : throw new AppException(401, "Please sign in.");
    public bool IsAdmin => P?.IsInRole("Admin") ?? false;
}

/// <summary>Validates every action argument that has a registered FluentValidation validator.</summary>
public sealed class ValidationFilter(IServiceProvider sp) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext ctx, ActionExecutionDelegate next)
    {
        foreach (var arg in ctx.ActionArguments.Values)
        {
            if (arg is null) continue;
            if (sp.GetService(typeof(IValidator<>).MakeGenericType(arg.GetType())) is not IValidator v) continue;
            var result = await v.ValidateAsync(new ValidationContext<object>(arg));
            if (result.IsValid) continue;
            var errors = result.Errors.GroupBy(e => e.PropertyName).ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            ctx.Result = new BadRequestObjectResult(new ValidationProblemDetails(errors) { Status = 400, Title = "Please check the form." });
            return;
        }
        await next();
    }
}

public sealed class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> log)
{
    public async Task Invoke(HttpContext ctx)
    {
        try { await next(ctx); }
        catch (AppException e) { await Write(ctx, e.Status, e.Message); }
        catch (ProviderException e)
        {
            log.LogError(e, "Model provider error");
            await Write(ctx, 502, "The assistant is unavailable right now. Please try again shortly.");
        }
        catch (OperationCanceledException) when (ctx.RequestAborted.IsCancellationRequested) { }
        catch (Exception e)
        {
            log.LogError(e, "Unhandled error");
            await Write(ctx, 500, "Something went wrong.");
        }
    }
    static Task Write(HttpContext ctx, int status, string message)
    {
        ctx.Response.StatusCode = status;
        return ctx.Response.WriteAsJsonAsync(new { status, title = message });
    }
}
