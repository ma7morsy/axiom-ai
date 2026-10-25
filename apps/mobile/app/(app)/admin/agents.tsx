import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import type { AgentDto, AgentRequest } from '@axiom/shared';
import { useAgentMutations, useAgents, useModels } from '../../../src/api/hooks';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Screen, Select, Spinner, useToast } from '../../../src/ui';

const blank: AgentRequest = { name: '', description: '', welcome: 'Hi! How can I help you today?', instructions: '', isLive: true, preferredModelId: null };

export default function Agents() {
  const t = useTheme();
  const toast = useToast();
  const router = useRouter();
  const agents = useAgents();
  const models = useModels();
  const m = useAgentMutations();
  const [editing, setEditing] = useState<AgentDto | 'new' | null>(null);
  const [form, setForm] = useState<AgentRequest>(blank);
  const [del, setDel] = useState<AgentDto | null>(null);

  const open = (a: AgentDto | 'new') => { setEditing(a); setForm(a === 'new' ? blank : { name: a.name, description: a.description, welcome: a.welcome, instructions: a.instructions, isLive: a.isLive, preferredModelId: a.preferredModelId }); };
  const save = async () => {
    try { if (editing === 'new') await m.create.mutateAsync(form); else if (editing) await m.update.mutateAsync({ id: editing.id, r: form }); setEditing(null); toast('Agent saved', 'success'); }
    catch (e) { toast((e as Error).message, 'error'); }
  };
  const link = async (a: AgentDto) => { await Clipboard.setStringAsync(`${Platform.OS === 'web' ? window.location.origin : ''}/c/${a.slug}`); toast('Customer link copied', 'success'); };

  return (
    <Screen title="Agents" subtitle="Each agent answers only from its own documents" right={<Button title="New agent" icon="add" onPress={() => open('new')} />}>
      {agents.isLoading ? <Spinner /> : agents.isError ? <ErrorState message="Could not load agents." onRetry={() => agents.refetch()} />
        : !agents.data?.length ? <EmptyState icon="hardware-chip-outline" title="No agents yet" hint="Create one, then upload its documents." />
        : agents.data.map(a => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={{ color: t.colors.text, fontWeight: '800', fontSize: t.font.lg }}>{a.name}</Text>
                <Text style={{ color: t.colors.muted, fontSize: t.font.sm }}>{a.description || 'No description'} · {a.documentCount} document{a.documentCount === 1 ? '' : 's'}</Text>
              </View>
              <Badge label={a.isLive ? 'Live' : 'Paused'} tone={a.isLive ? 'success' : 'neutral'} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button title="Edit" icon="create-outline" small variant="secondary" onPress={() => open(a)} />
              <Button title="Documents" icon="library-outline" small variant="secondary" onPress={() => router.push(`/admin/knowledge?agent=${a.id}` as never)} />
              <Button title="Copy link" icon="link-outline" small variant="secondary" onPress={() => link(a)} />
              <Button icon="trash-outline" small variant="danger" onPress={() => setDel(a)} accessibilityLabel={`Delete ${a.name}`} />
            </View>
          </Card>))}

      <Modal visible={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New agent' : 'Edit agent'}
        footer={<View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}><Button title="Cancel" variant="secondary" onPress={() => setEditing(null)} /><Button title="Save" onPress={save} disabled={!form.name.trim()} loading={m.create.isPending || m.update.isPending} /></View>}>
        <Input label="Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
        <Input label="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} />
        <Input label="Welcome message" value={form.welcome} onChangeText={v => setForm(f => ({ ...f, welcome: v }))} />
        <Input label="Extra instructions (tone, company name, escalation contact)" multiline value={form.instructions} onChangeText={v => setForm(f => ({ ...f, instructions: v }))} />
        <Select label="Preferred model" value={form.preferredModelId ?? 'none'} onChange={v => setForm(f => ({ ...f, preferredModelId: v === 'none' ? null : v }))}
          options={[{ value: 'none', label: 'Automatic (by priority)' }, ...(models.data ?? []).filter(x => x.capabilities.includes('text')).map(x => ({ value: x.id, label: x.displayName }))]} />
        <Checkbox label="Agent is live (customers can open its link)" checked={form.isLive} onChange={v => setForm(f => ({ ...f, isLive: v }))} />
      </Modal>
      <ConfirmDialog visible={!!del} title="Delete agent?" message={`"${del?.name}" and its link will stop working.`} confirmLabel="Delete" danger onCancel={() => setDel(null)}
        onConfirm={async () => { const id = del!.id; setDel(null); try { await m.remove.mutateAsync(id); toast('Agent deleted', 'success'); } catch (e) { toast((e as Error).message, 'error'); } }} />
    </Screen>
  );
}
