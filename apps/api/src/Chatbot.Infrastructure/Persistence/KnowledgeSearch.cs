using System.Text.RegularExpressions;
using Chatbot.Application.Abstractions;
using Microsoft.EntityFrameworkCore;
namespace Chatbot.Infrastructure.Persistence;

/// <summary>PostgreSQL full-text search (BM25-like ts_rank). Swap for pgvector later without touching callers.</summary>
public sealed class KnowledgeSearch(AppDbContext db) : IKnowledgeSearch
{
    public async Task<IReadOnlyList<ChunkHit>> SearchAsync(Guid agentId, string query, int limit, CancellationToken ct)
    {
        var tokens = Regex.Matches(query.ToLowerInvariant(), @"[\p{L}\p{N}]+").Select(m => m.Value).Distinct().Take(40).ToList();
        if (tokens.Count == 0) return [];
        var tsq = string.Join(" | ", tokens);
        var hits = await db.Database.SqlQuery<ChunkHit>($"""
            SELECT d."FileName" AS "DocumentName", c."Content" AS "Content",
                   ts_rank(to_tsvector('simple', c."Content"), to_tsquery('simple', {tsq})) AS "Rank"
            FROM "DocumentChunks" c JOIN "Documents" d ON d."Id" = c."DocumentId"
            WHERE c."AgentId" = {agentId} AND d."DeletedAt" IS NULL
              AND to_tsvector('simple', c."Content") @@ to_tsquery('simple', {tsq})
            LIMIT {limit * 4}
            """).ToListAsync(ct);
        return hits.OrderByDescending(h => h.Rank).Take(limit).ToList();
    }
}
