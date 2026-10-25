import React, { useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import type { ArtifactDto, MessageDto } from '@axiom/shared';
import { useAuth } from '../../../src/auth/AuthProvider';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useBreakpoint } from '../../../src/hooks/useBreakpoint';
import { useAgents, useConversations, useMessages, useSendMessage } from '../../../src/api/hooks';
import { ChatView } from '../../../src/features/chat/ChatView';
import { ArtifactPanel } from '../../../src/features/chat/ArtifactPanel';
import { useSpeak } from '../../../src/features/chat/useSpeak';
import { Button, Drawer, EmptyState, Spinner, useToast } from '../../../src/ui';

export default function ChatRoute() {
  const { id, agent } = useLocalSearchParams<{ id: string; agent?: string }>();
  return <ChatScreen key={`${id}-${agent ?? ''}`} routeId={id} agentParam={agent} />;
}

function ChatScreen({ routeId, agentParam }: { routeId: string; agentParam?: string }) {
  const t = useTheme();
  const toast = useToast();
  const { user, isAdmin } = useAuth();
  const { isDesktop } = useBreakpoint();
  const isNew = routeId === 'new';
  const agents = useAgents();
  const convos = useConversations();
  const history = useMessages(isNew ? null : routeId);
  const send = useSendMessage();
  const { speak } = useSpeak();

  const [convId, setConvId] = useState<string | null>(isNew ? null : routeId);
  const [local, setLocal] = useState<MessageDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastText, setLastText] = useState('');
  const [artifact, setArtifact] = useState<ArtifactDto | null>(null);

  const agentId = useMemo(() => {
    if (!isNew) return convos.data?.find(c => c.id === routeId)?.agentId;
    return agentParam ?? agents.data?.find(a => a.isLive)?.id;
  }, [isNew, routeId, agentParam, convos.data, agents.data]);
  const agentInfo = agents.data?.find(a => a.id === agentId);
  const messages = [...(history.data ?? []), ...local];

  const submit = async (text: string) => {
    if (!agentId) { toast('No agent available yet. Ask an admin to create one.', 'error'); return; }
    setError(null); setLastText(text);
    setLocal(l => [...l, { id: 'u' + Date.now(), role: 'user', content: text, sources: [], modelName: null, createdAt: new Date().toISOString(), artifacts: [] }]);
    try {
      const r = await send.mutateAsync({ agentId, conversationId: convId, message: text });
      setConvId(r.conversationId); setLocal(l => [...l, r.message]);
      if (r.message.artifacts[0]) setArtifact(r.message.artifacts[0]);
    } catch (e) { setError((e as Error).message); }
  };
  const retry = () => { setLocal(l => l.slice(0, -1)); submit(lastText); };
  const updateArtifact = (a: ArtifactDto) => {
    setArtifact(a);
    setLocal(l => l.map(m => ({ ...m, artifacts: m.artifacts.map(x => (x.id === a.id ? a : x)) })));
  };
  const share = async () => {
    const slug = agentInfo?.slug; if (!slug) return;
    const origin = Platform.OS === 'web' ? window.location.origin : '';
    await Clipboard.setStringAsync(`${origin}/c/${slug}`); toast('Customer link copied', 'success');
  };

  if (!isNew && history.isLoading) return <Spinner label="Loading conversation…" />;
  if (!isNew && history.isError) return <EmptyState icon="alert-circle-outline" title="Conversation not found" hint="It may have been deleted." />;
  if (agents.isSuccess && !agentId && isNew) return <EmptyState icon="hardware-chip-outline" title="No agent yet" hint={isAdmin ? 'Create one in Admin > Agents.' : 'Ask an admin to create an agent.'} />;

  const lastModel = [...messages].reverse().find(m => m.modelName)?.modelName;
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: t.colors.surface, borderBottomWidth: 1, borderBottomColor: t.colors.border }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: t.colors.text, fontWeight: '800', fontSize: t.font.lg }}>{agentInfo?.name ?? 'Assistant'}</Text>
            {lastModel ? <Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>{lastModel}</Text> : null}
          </View>
          {isAdmin ? <Button title="Share" icon="share-social-outline" small onPress={share} /> : null}
        </View>
        <ChatView messages={messages} sending={send.isPending} error={error} welcome={agentInfo?.welcome} who={user?.displayName ?? 'Me'}
          onSend={submit} onRetry={retry} onOpenArtifact={setArtifact} onSpeak={speak} />
      </View>
      {artifact && isDesktop ? <View style={{ width: 420, borderLeftWidth: 1, borderLeftColor: t.colors.border }}><ArtifactPanel artifact={artifact} onChange={updateArtifact} onClose={() => setArtifact(null)} /></View> : null}
      {!isDesktop ? <Drawer visible={!!artifact} onClose={() => setArtifact(null)} side="right" width={480}>{artifact ? <ArtifactPanel artifact={artifact} onChange={updateArtifact} onClose={() => setArtifact(null)} /> : null}</Drawer> : null}
    </View>
  );
}
