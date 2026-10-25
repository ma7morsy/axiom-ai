using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Chatbot.Application.Abstractions;
using Chatbot.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
namespace Chatbot.Infrastructure.Security;

public class JwtOptions { public string Key { get; set; } = ""; public string Issuer { get; set; } = "axiom"; public string Audience { get; set; } = "axiom"; public int ExpiryDays { get; set; } = 7; }
public class SecurityOptions { public string EncryptionKey { get; set; } = ""; }

/// <summary>AES-256-GCM so provider API keys are never stored in plain text.</summary>
public sealed class SecretProtector(IOptions<SecurityOptions> o) : ISecretProtector
{
    readonly byte[] key = SHA256.HashData(Encoding.UTF8.GetBytes(o.Value.EncryptionKey));
    public string Protect(string plain)
    {
        if (string.IsNullOrEmpty(plain)) return "";
        var iv = RandomNumberGenerator.GetBytes(12); var data = Encoding.UTF8.GetBytes(plain);
        var enc = new byte[data.Length]; var tag = new byte[16];
        using var gcm = new AesGcm(key, 16); gcm.Encrypt(iv, data, enc, tag);
        return string.Join('.', Convert.ToBase64String(iv), Convert.ToBase64String(tag), Convert.ToBase64String(enc));
    }
    public string Unprotect(string cipher)
    {
        if (string.IsNullOrEmpty(cipher)) return "";
        try
        {
            var p = cipher.Split('.'); var iv = Convert.FromBase64String(p[0]); var tag = Convert.FromBase64String(p[1]); var enc = Convert.FromBase64String(p[2]);
            var plain = new byte[enc.Length];
            using var gcm = new AesGcm(key, 16); gcm.Decrypt(iv, enc, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }
        catch (Exception) { return ""; }
    }
}

public sealed class BcryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, 12);
    public bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}

public sealed class JwtTokenService(IOptions<JwtOptions> o) : ITokenService
{
    public string Create(User u)
    {
        var cfg = o.Value;
        var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg.Key)), SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, u.Id.ToString()), new Claim(ClaimTypes.Email, u.Email),
            new Claim(ClaimTypes.Role, u.Role.ToString())
        };
        var token = new JwtSecurityToken(cfg.Issuer, cfg.Audience, claims, expires: DateTime.UtcNow.AddDays(cfg.ExpiryDays), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
