using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
namespace Chatbot.Application.Services;

public sealed class AuthService(IAppDbContext db, IPasswordHasher hasher, ITokenService tokens, IOptions<AppOptions> opts)
{
    public async Task<bool> RegistrationOpenAsync(CancellationToken ct) => !await db.Users.AnyAsync(ct) || opts.Value.AllowRegistration;

    public async Task<AuthResponse> RegisterAsync(RegisterRequest r, CancellationToken ct)
    {
        var email = r.Email.Trim().ToLowerInvariant();
        var first = !await db.Users.AnyAsync(ct);
        if (!first && !opts.Value.AllowRegistration) throw new ForbiddenException("Registration is closed. Ask an admin for an account.");
        if (await db.Users.AnyAsync(u => u.Email == email, ct)) throw new ConflictException("Email already registered.");
        var user = new User
        {
            Email = email, PasswordHash = hasher.Hash(r.Password), Role = first ? UserRole.Admin : UserRole.Member,
            DisplayName = string.IsNullOrWhiteSpace(r.DisplayName) ? email.Split('@')[0] : r.DisplayName.Trim()
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return Build(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest r, CancellationToken ct)
    {
        var email = r.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user is null || !hasher.Verify(r.Password, user.PasswordHash)) throw new AppException(401, "Wrong email or password.");
        return Build(user);
    }

    AuthResponse Build(User u) => new(tokens.Create(u), u.Email, u.Role.ToString().ToLowerInvariant(), u.DisplayName);
}
