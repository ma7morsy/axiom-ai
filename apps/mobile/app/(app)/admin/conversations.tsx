import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { ConversationDto } from '@axiom/shared';
import { useAdminConversations, useMessages } from '../../../src/api/hooks';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { MessageBubble } from '../../../src/features/chat/MessageBubble';
import { Card, Column, EmptyState, ErrorState, Modal, Screen, Spinner, Table } from '../../../src/ui';

function Thread({ id }: { id: string }) {
  const msgs = useMessages(id, true);
  if (msgs.isLoading) return <Spinner />;
  if (msgs.isError) return <ErrorState message="Could not load this conversation." onRetry={() => msgs.refetch()} />;
  return <View style={{ gap: 14 }}>{msgs.data!.map(m => <MessageBubble key={m.id} message={m} who="Customer" onOpenArtifact={() => {}} />)}</View>;
}

export default function Conversations() {
  const t = useTheme();
  const list = useAdminConversations();
  const [open, setOpen] = useState<ConversationDto | null>(null);
  const cols: Column<ConversationDto>[] = [
    { key: 't', title: 'First question', flex: 3, render: r => <Text numberOfLines={1} style={{ color: t.colors.text }} accessibilityRole="link">{r.title || '(empty)'}</Text> },
    { key: 'a', title: 'Agent', flex: 1, hideOnMobile: true, render: r => <Text style={{ color: t.colors.muted }}>{r.agentName}</Text> },
    { key: 'm', title: 'Msgs', render: r => <Text style={{ color: t.colors.muted }}>{r.messageCount}</Text> },
    { key: 'd', title: 'Updated', flex: 1, hideOnMobile: true, render: r => <Text style={{ color: t.colors.muted }}>{new Date(r.updatedAt).toLocaleDateString()}</Text> }
  ];
  return (
    <Screen title="Conversations" subtitle="What customers asked and which documents answered">
      <Card>
        {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message="Could not load conversations." onRetry={() => list.refetch()} />
          : list.data?.length ? <Table columns={cols} rows={list.data} rowKey={r => r.id} onRowPress={setOpen} />
          : <EmptyState icon="chatbubbles-outline" title="No conversations yet" hint="Share a customer link to get started." />}
      </Card>
      <Modal visible={!!open} onClose={() => setOpen(null)} title={open?.title || 'Conversation'}>{open ? <Thread id={open.id} /> : null}</Modal>
    </Screen>
  );
}
