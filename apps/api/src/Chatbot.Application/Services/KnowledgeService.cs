using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Application.Dtos;
using Chatbot.Domain;
using Microsoft.EntityFrameworkCore;
namespace Chatbot.Application.Services;

public sealed class KnowledgeService(IAppDbContext db, IDocumentTextExtractor extractor)
{
    public async Task<List<DocumentDto>> ListAsync(Guid agentId, CancellationToken ct) =>
        (await db.Documents.Where(d => d.AgentId == agentId).OrderByDescending(d => d.CreatedAt).Select(d => new Document { Id = d.Id, AgentId = d.AgentId, FileName = d.FileName, Characters = d.Characters, CreatedAt = d.CreatedAt }).ToListAsync(ct))
        .Select(d => d.ToDto()).ToList();

    public async Task<UploadResultDto> AddAsync(Guid agentId, Stream content, string fileName, CancellationToken ct)
    {
        if (!await db.Agents.AnyAsync(a => a.Id == agentId, ct)) throw new NotFoundException("Agent not found.");
        string text;
        try { text = (await extractor.ExtractAsync(content, fileName, ct)).Trim(); }
        catch (BadRequestException e) { return new(fileName, false, e.Message); }
        catch (Exception) { return new(fileName, false, "Could not read this file."); }
        if (text.Length == 0) return new(fileName, false, "No readable text (scanned PDFs need OCR).");

        await db.InTransactionAsync(async () =>
        {
            var old = await db.Documents.Where(d => d.AgentId == agentId && d.FileName == fileName).ToListAsync(ct);
            foreach (var o in old) await RemoveAsync(o, ct);
            var doc = new Document { AgentId = agentId, FileName = fileName, Characters = text.Length, Text = text };
            var pos = 0;
            foreach (var c in Chunker.Split(text)) doc.Chunks.Add(new DocumentChunk { AgentId = agentId, Position = pos++, Content = c });
            db.Documents.Add(doc);
            await db.SaveChangesAsync(ct);
            return true;
        }, ct);
        return new(fileName, true, null);
    }

    public async Task DeleteAsync(Guid documentId, CancellationToken ct)
    {
        var d = await db.Documents.FirstOrDefaultAsync(x => x.Id == documentId, ct) ?? throw new NotFoundException("Document not found.");
        await RemoveAsync(d, ct);
        await db.SaveChangesAsync(ct);
    }

    async Task RemoveAsync(Document d, CancellationToken ct)
    {
        db.DocumentChunks.RemoveRange(await db.DocumentChunks.Where(c => c.DocumentId == d.Id).ToListAsync(ct));
        d.DeletedAt = DateTime.UtcNow;
    }
}
