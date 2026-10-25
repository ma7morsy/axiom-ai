using System.Text.RegularExpressions;
using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using UglyToad.PdfPig;
namespace Chatbot.Infrastructure.Media;

public sealed class DocumentTextExtractor : IDocumentTextExtractor
{
    public async Task<string> ExtractAsync(Stream content, string fileName, CancellationToken ct)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant().TrimStart('.');
        using var ms = new MemoryStream(); await content.CopyToAsync(ms, ct); ms.Position = 0;
        switch (ext)
        {
            case "txt" or "md" or "csv" or "json": return Normalize(new StreamReader(ms).ReadToEnd());
            case "html" or "htm":
                var html = new StreamReader(ms).ReadToEnd();
                html = Regex.Replace(html, "<(script|style)[\\s\\S]*?</\\1>", " ", RegexOptions.IgnoreCase);
                return Normalize(Regex.Replace(html, "<[^>]+>", " "));
            case "pdf":
                using (var pdf = PdfDocument.Open(ms))
                    return Normalize(string.Join("\n\n", pdf.GetPages().Select(p => string.Join(" ", p.GetWords().Select(w => w.Text)))));
            case "docx":
                using (var doc = WordprocessingDocument.Open(ms, false))
                    return Normalize(string.Join("\n\n", doc.MainDocumentPart?.Document.Body?.Descendants<Paragraph>().Select(p => p.InnerText) ?? Enumerable.Empty<string>()));
            default: throw new BadRequestException("Unsupported file type.");
        }
    }
    static string Normalize(string s) => Regex.Replace(s, "[ \\t]+", " ").Trim();
}
