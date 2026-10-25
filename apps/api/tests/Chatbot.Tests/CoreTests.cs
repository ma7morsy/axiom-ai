using Chatbot.Application.Abstractions;
using Chatbot.Application.Common;
using Chatbot.Domain;
using Xunit;
namespace Chatbot.Tests;

public class ChunkerTests
{
    [Fact] public void Splits_long_text_into_bounded_chunks()
    {
        var text = string.Join("\n\n", Enumerable.Range(0, 40).Select(i => $"Paragraph {i}. " + new string('x', 200)));
        var chunks = Chunker.Split(text);
        Assert.True(chunks.Count > 1);
        Assert.All(chunks, c => Assert.True(c.Length < 1600));
    }
    [Fact] public void Empty_text_gives_no_chunks() => Assert.Empty(Chunker.Split("   "));
}

public class ArtifactParserTests
{
    [Fact] public void Extracts_artifact_and_strips_it_from_text()
    {
        var (text, arts) = ArtifactParser.Extract("Here you go.\n<artifact type=\"HTML\" title=\"Plan\"><h1>Hi</h1></artifact>");
        Assert.Equal("Here you go.", text);
        var a = Assert.Single(arts);
        Assert.Equal("html", a.Type); Assert.Equal("Plan", a.Title); Assert.Equal("<h1>Hi</h1>", a.Content);
    }
    [Fact] public void Plain_reply_is_unchanged()
    {
        var (text, arts) = ArtifactParser.Extract("Just text");
        Assert.Equal("Just text", text); Assert.Empty(arts);
    }
}

public class ChatTurnsTests
{
    [Fact] public void Drops_leading_assistant_and_merges_same_roles()
    {
        var r = ChatTurns.Normalize([new("assistant", "hi"), new("user", "a"), new("user", "b"), new("assistant", "c")]);
        Assert.Equal(2, r.Count); Assert.Equal("user", r[0].Role); Assert.Equal("a\nb", r[0].Content);
    }
}

public class CostTests
{
    [Fact] public void Chat_cost_uses_per_1k_prices()
    {
        var m = new AiModel { InputPricePer1K = 0.5m, OutputPricePer1K = 1.5m };
        Assert.Equal(1.25m, CostEstimator.Chat(m, 1000, 500));
    }
    [Fact] public void Video_cost_scales_with_duration() => Assert.Equal(0.10m, CostEstimator.Media(MediaKind.TextToVideo, 10));
}

public class CapabilityTests
{
    [Fact] public void Round_trips_names()
    {
        var c = CapabilityMap.Parse(["text", "TTS", "bogus"]);
        Assert.Equal(Capability.Text | Capability.Tts, c);
        Assert.Equal(new[] { "text", "tts" }, CapabilityMap.ToNames(c));
    }
}
