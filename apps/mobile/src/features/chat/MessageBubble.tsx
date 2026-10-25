import React from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { isRtl, type ArtifactDto, type MessageDto } from '@axiom/shared';
import { useTheme } from '../../theme/ThemeProvider';
import { Avatar, IconButton, useToast } from '../../ui';
import { Markdown } from '../Markdown';

export function MessageBubble({ message, who, onOpenArtifact, onSpeak, showSources = true }: {
  message: MessageDto; who: string; onOpenArtifact: (a: ArtifactDto) => void; onSpeak?: (text: string) => void; showSources?: boolean;
}) {
  const t = useTheme();
  const toast = useToast();
  const user = message.role === 'user';
  const rtl = isRtl(message.content);
  return (
    <View style={{ flexDirection: user ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
      <Avatar name={user ? who : 'A'} color={user ? t.colors.info : t.colors.primary} />
      <View style={{ maxWidth: '84%', flexShrink: 1, gap: 6 }}>
        <View style={{ backgroundColor: user ? t.colors.userBubble : t.colors.botBubble, borderRadius: t.radius.lg, padding: 12, borderWidth: user ? 0 : 1, borderColor: t.colors.border }}>
          {user ? <Text selectable style={{ color: t.colors.text, fontSize: t.font.md, lineHeight: 23, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }}>{message.content}</Text> : <Markdown text={message.content} />}
        </View>
        {message.artifacts.map(a => (
          <Pressable key={a.id} onPress={() => onOpenArtifact(a)} accessibilityRole="button" accessibilityLabel={`Open ${a.title}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface }}>
            <Ionicons name="document-text-outline" size={20} color={t.colors.primary} />
            <View style={{ flex: 1 }}><Text style={{ color: t.colors.text, fontWeight: '700' }}>{a.title}</Text><Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>Open {a.type} · v{a.version}</Text></View>
            <Ionicons name="chevron-forward" size={16} color={t.colors.muted} />
          </Pressable>
        ))}
        {!user && showSources && message.sources.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {message.sources.map(s => <View key={s} style={{ flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: t.colors.userBubble, paddingHorizontal: 8, paddingVertical: 3, borderRadius: t.radius.pill }}>
              <Ionicons name="document-outline" size={12} color={t.colors.primary} /><Text style={{ color: t.colors.primary, fontSize: t.font.xs }}>{s}</Text></View>)}
          </View>
        ) : null}
        {!user ? (
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="copy-outline" label="Copy reply" size={16} onPress={async () => { await Clipboard.setStringAsync(message.content); toast('Copied', 'success'); }} />
            {onSpeak ? <IconButton icon="volume-medium-outline" label="Read aloud" size={16} onPress={() => onSpeak(message.content)} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
