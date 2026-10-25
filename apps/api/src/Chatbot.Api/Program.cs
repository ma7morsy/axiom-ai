using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Chatbot.Api.Infrastructure;
using Chatbot.Application;
using Chatbot.Application.Abstractions;
using Chatbot.Infrastructure;
using Chatbot.Infrastructure.Media;
using Chatbot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

var jwtKey = cfg["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32) throw new InvalidOperationException("Set Jwt__Key to a random string of 32+ characters.");
if (string.IsNullOrWhiteSpace(cfg["Security:EncryptionKey"])) throw new InvalidOperationException("Set Security__EncryptionKey.");

builder.Services.AddApplication(cfg).AddInfrastructure(cfg);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddControllers(o => o.Filters.Add<ValidationFilter>())
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = cfg["Jwt:Issuer"] ?? "axiom",
        ValidateAudience = true, ValidAudience = cfg["Jwt:Audience"] ?? "axiom",
        ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1)
    };
});
builder.Services.AddAuthorization(o => o.AddPolicy("Admin", p => p.RequireRole("Admin")));

var origins = (cfg["Cors:Origins"] ?? "http://localhost:8081,http://localhost:19006").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));
// public chat pages may be embedded and called from any site
builder.Services.AddCors(o => o.AddPolicy("public", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    RateLimitPartition<string> Fixed(HttpContext c, int permits, TimeSpan window) =>
        RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = permits, Window = window });
    o.AddPolicy("auth", c => Fixed(c, 20, TimeSpan.FromMinutes(15)));
    o.AddPolicy("public-chat", c => Fixed(c, 20, TimeSpan.FromMinutes(1)));
});
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear(); o.KnownProxies.Clear();
});

var app = builder.Build();
app.UseForwardedHeaders();
app.UseMiddleware<ExceptionMiddleware>();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

var storage = LocalFileStorage.Root(cfg); Directory.CreateDirectory(storage);
app.UseStaticFiles(new StaticFileOptions { FileProvider = new PhysicalFileProvider(storage), RequestPath = "/files" });

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

await app.Services.InitializeAsync();
app.Run();

public partial class Program { }
