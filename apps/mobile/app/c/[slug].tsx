import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { ArtifactDto, ChatReplyDto, MessageDto, PublicAgentDto } from '@axiom/shared';
import { api } from '../../src/api/client';
import { storage } from '../../src/lib/storage';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ChatView } from '../../src/features/chat/ChatView';
import { ArtifactPanel } from '../../src/features/chat/ArtifactPanel';
import { Avatar, Drawer, ErrorState, Spinner } from '../../src/ui';

const newSession = () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

/** Public customer view: chat only, no sign-in, no admin tools. */
export default function CustomerChat() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [info, setInfo] = useState<PublicAgentDto | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [session, setSession] = useState<string>('');
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState('');
  const [artifact, setArtifact] = useState<ArtifactDto | null>(null);

  useEffect(() => {
    (async () => {
      const key = `sid_${slug}`;
      let s = await storage.get(key); if (!s) { s = newSession(); await storage.set(key, s); }
      setSession(s);
      try { setInfo(await api<PublicAgentDto>(`/public/${slug}`, { auth: false })); } catch (e) { setFatal((e as Error).message); }
    })();
  }, [slug]);

  const submit = async (text: string) => {
    setError(null); setLast(text); setSending(true);
    setMessages(m => [...m, { id: 'u' + Date.now(), role: 'user', content: text, sources: [], modelName: null, createdAt: '', artifacts: [] }]);
    try {
      const r = await api<ChatReplyDto>(`/public/${slug}/chat`, { body: { session, message: text }, auth: false });
      setMessages(m => [...m, r.message]);
    } catch (e) { setError((e as Error).message); }
    setSending(false);
  };

  if (fatal) return <View style={{ flex: 1, backgroundColor: t.colors.bg, justifyContent: 'center' }}><ErrorState message={fatal} /></View>;
  if (!info || !session) return <View style={{ flex: 1, backgroundColor: t.colors.bg, justifyContent: 'center' }}><Spinner /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: t.colors.surface, borderBottomWidth: 1, borderBottomColor: t.colors.border }}>
        <Avatar name={info.name} color={t.colors.primary} size={36} />
        <Text accessibilityRole="header" style={{ color: t.colors.text, fontWeight: '800', fontSize: t.font.lg }}>{info.name}</Text>
      </View>
      <ChatView customer messages={messages} sending={sending} error={error} welcome={info.welcome} who="You" onSend={submit}
        onRetry={() => { setMessages(m => m.slice(0, -1)); submit(last); }} onOpenArtifact={setArtifact} />
      <Drawer visible={!!artifact} onClose={() => setArtifact(null)} side="right" width={480}>
        {artifact ? <ArtifactPanel artifact={artifact} onChange={setArtifact} onClose={() => setArtifact(null)} /> : null}
      </Drawer>
      <Text style={{ color: t.colors.muted, fontSize: t.font.xs, textAlign: 'center', paddingBottom: 6 }}>Powered by Axiom AI</Text>
    </View>
  );
}
