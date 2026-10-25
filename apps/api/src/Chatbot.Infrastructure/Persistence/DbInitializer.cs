using Chatbot.Application.Abstractions;
using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
namespace Chatbot.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task InitializeAsync(this IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var log = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbInitializer");
        var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        if (db.Database.GetMigrations().Any()) await db.Database.MigrateAsync();
        else { log.LogWarning("No EF migrations found: creating schema directly. Run scripts/add-migration.sh for production."); await db.Database.EnsureCreatedAsync(); }

        await db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS ix_chunks_fts ON "DocumentChunks" USING GIN (to_tsvector('simple', "Content"))""");

        if (cfg.GetValue<bool>("Seed:Enabled")) await SeedAsync(db, scope.ServiceProvider, cfg);
    }

    static async Task SeedAsync(AppDbContext db, IServiceProvider sp, IConfiguration cfg)
    {
        var email = cfg["Seed:AdminEmail"]; var pw = cfg["Seed:AdminPassword"];
        if (!await db.Users.AnyAsync() && !string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(pw))
            db.Users.Add(new User { Email = email.ToLowerInvariant(), DisplayName = "Admin", Role = UserRole.Admin, PasswordHash = sp.GetRequiredService<IPasswordHasher>().Hash(pw) });
        if (!await db.Agents.AnyAsync())
            db.Agents.Add(new Agent { Slug = "general", Name = "General Assistant", Description = "Answers from your uploaded documents", Instructions = "Be friendly and concise." });
        await db.SaveChangesAsync();
    }
}
