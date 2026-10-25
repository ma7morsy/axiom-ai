import React, { useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { ArtifactDto, MessageDto } from '@axiom/shared';
import { useTheme } from '../../theme/ThemeProvider';
import { Avatar, ErrorState } from '../../ui';
import { MessageBubble } from './MessageBubble';
import { Composer } from './Composer';

function Typing() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }} accessibilityLabel="Assistant is typing">
      <Avatar name="A" color={t.colors.primary} />
      <View style={{ flexDirection: 'row', gap: 4, padding: 14, backgroundColor: t.colors.botBubble, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border }}>
        {[0, 1, 2].map(i => <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.colors.muted, opacity: 0.4 + i * 0.25 }} />)}
      </View>
    </View>
  );
}

export function ChatView({ messages, sending, error, welcome, who, onSend, onRetry, onOpenArtifact, onSpeak, customer }: {
  messages: MessageDto[]; sending: boolean; error?: string | null; welcome?: string; who: string; customer?: boolean;
  onSend: (t: string) => void; onRetry?: () => void; onOpenArtifact: (a: ArtifactDto) => void; onSpeak?: (t: string) => void;
}) {
  const t = useTheme();
  const scroll = useRef<ScrollView>(null);
  const shown: MessageDto[] = messages.length || !welcome ? messages
    : [{ id: 'welcome', role: 'assistant', content: welcome, sources: [], modelName: null, createdAt: '', artifacts: [] }];
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, maxWidth: 860, width: '100%', alignSelf: 'center' }}>
        {shown.map(m => <MessageBubble key={m.id} message={m} who={who} onOpenArtifact={onOpenArtifact} onSpeak={onSpeak} showSources={!customer} />)}
        {sending ? <Typing /> : null}
        {error ? <ErrorState message={error} onRetry={onRetry} /> : null}
      </ScrollView>
      <View style={{ maxWidth: 860, width: '100%', alignSelf: 'center' }}>
        <Composer onSend={onSend} busy={sending} tools={!customer} voice={!customer} />
        {customer ? <Text style={{ color: t.colors.muted, fontSize: t.font.xs, textAlign: 'center', paddingBottom: 8 }}>Answers come from our documents.</Text> : null}
      </View>
    </View>
  );
}
