import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { CapabilityName, ModelDto, ModelRequest, Provider } from '@axiom/shared';
import { useModelMutations, useModels } from '../../../src/api/hooks';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Badge, Button, Checkbox, Column, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Screen, Select, Spinner, Table, useToast, Card } from '../../../src/ui';

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'openAiCompatible', label: 'OpenAI-compatible (OpenAI, Groq, OpenRouter, DeepSeek, Ollama, Gemini compat.)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' }, { value: 'gemini', label: 'Google Gemini (native)' }];
const CAPS: CapabilityName[] = ['text', 'vision', 'stt', 'tts', 'image', 'video'];
const blank: ModelRequest & { apiKey: string } = { displayName: '', provider: 'openAiCompatible', modelName: '', baseUrl: 'https://api.openai.com/v1', apiKey: '', priority: 100, capabilities: ['text'], inputPricePer1K: 0, outputPricePer1K: 0, isActive: true };

export default function Models() {
  const t = useTheme();
  const toast = useToast();
  const models = useModels();
  const m = useModelMutations();
  const [editing, setEditing] = useState<ModelDto | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [del, setDel] = useState<ModelDto | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const open = (x: ModelDto | 'new') => {
    setEditing(x);
    setForm(x === 'new' ? blank : { displayName: x.displayName, provider: x.provider, modelName: x.modelName, baseUrl: x.baseUrl, apiKey: '', priority: x.priority, capabilities: x.capabilities, inputPricePer1K: x.inputPricePer1K, outputPricePer1K: x.outputPricePer1K, isActive: x.isActive });
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    const body = { ...form, apiKey: form.apiKey || undefined };
    try {
      if (editing === 'new') await m.create.mutateAsync(body); else if (editing) await m.update.mutateAsync({ id: editing.id, r: body });
      setEditing(null); toast('Model saved', 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
  };
  const test = async (id: string) => {
    setTesting(id);
    try { const r = await m.test.mutateAsync(id); toast(r.ok ? r.message : `Failed: ${r.message}`, r.ok ? 'success' : 'error'); } catch (e) { toast((e as Error).message, 'error'); }
    setTesting(null);
  };

  const cols: Column<ModelDto>[] = [
    { key: 'name', title: 'Model', flex: 2, render: r => <View><Text style={{ color: t.colors.text, fontWeight: '700' }}>{r.displayName}</Text><Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>{r.modelName}</Text></View> },
    { key: 'caps', title: 'Capabilities', flex: 2, hideOnMobile: true, render: r => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{r.capabilities.map(c => <Badge key={c} label={c} tone="info" />)}</View> },
    { key: 'prio', title: 'Priority', hideOnMobile: true, render: r => <Text style={{ color: t.colors.text }}>{r.priority}</Text> },
    { key: 'status', title: 'Status', render: r => <Badge label={r.isActive ? (r.hasKey ? 'Active' : 'No key') : 'Inactive'} tone={r.isActive && r.hasKey ? 'success' : 'danger'} /> },
    { key: 'act', title: '', flex: 2, render: r => (
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Button title="Test" small variant="secondary" loading={testing === r.id} onPress={() => test(r.id)} />
        <Button icon="create-outline" small variant="secondary" onPress={() => open(r)} accessibilityLabel={`Edit ${r.displayName}`} />
        <Button icon="trash-outline" small variant="danger" onPress={() => setDel(r)} accessibilityLabel={`Delete ${r.displayName}`} />
      </View>) }
  ];

  return (
    <Screen title="Models" subtitle="Connect any AI model. Lower priority is tried first; failures fall back to the next." right={<Button title="Add model" icon="add" onPress={() => open('new')} />}>
      <Card>
        {models.isLoading ? <Spinner /> : models.isError ? <ErrorState message="Could not load models." onRetry={() => models.refetch()} />
          : models.data?.length ? <Table columns={cols} rows={models.data} rowKey={r => r.id} />
          : <EmptyState icon="cube-outline" title="No models yet" hint="Add one so your agents can reply." />}
      </Card>

      <Modal visible={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a model' : 'Edit model'}
        footer={<View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}><Button title="Cancel" variant="secondary" onPress={() => setEditing(null)} /><Button title="Save" onPress={save} loading={m.create.isPending || m.update.isPending} disabled={!form.displayName || !form.modelName} /></View>}>
        <Select label="Provider" value={form.provider} options={PROVIDERS} onChange={v => setForm(f => ({ ...f, provider: v, baseUrl: v === 'openAiCompatible' ? 'https://api.openai.com/v1' : '' }))} />
        <Input label="Display name" value={form.displayName} onChangeText={v => set('displayName', v)} placeholder="Gemini Flash" />
        <Input label="Model name" value={form.modelName} onChangeText={v => set('modelName', v)} placeholder="e.g. gemini-2.5-flash" autoCapitalize="none" />
        {form.provider === 'openAiCompatible' ? <Input label="Base URL" value={form.baseUrl} onChangeText={v => set('baseUrl', v)} autoCapitalize="none" hint="Gemini compatible: https://generativelanguage.googleapis.com/v1beta/openai" /> : null}
        <Input label="API key" value={form.apiKey} onChangeText={v => set('apiKey', v)} secureTextEntry autoCapitalize="none" placeholder={editing !== 'new' ? 'Saved. Leave blank to keep' : ''} hint="Stored encrypted on the server." />
        <Input label="Priority (lower is tried first)" value={String(form.priority)} onChangeText={v => set('priority', Number(v.replace(/\D/g, '')) || 0)} keyboardType="number-pad" />
        <Text style={{ color: t.colors.text, fontWeight: '600', fontSize: t.font.sm }}>Capabilities</Text>
        <View style={{ gap: 8 }}>{CAPS.map(c => <Checkbox key={c} label={c} checked={form.capabilities.includes(c)} onChange={on => set('capabilities', on ? [...form.capabilities, c] : form.capabilities.filter(x => x !== c))} />)}</View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Input label="Input $/1K tokens" value={String(form.inputPricePer1K)} onChangeText={v => set('inputPricePer1K', Number(v) || 0)} keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Input label="Output $/1K tokens" value={String(form.outputPricePer1K)} onChangeText={v => set('outputPricePer1K', Number(v) || 0)} keyboardType="decimal-pad" /></View>
        </View>
        <Checkbox label="Active" checked={form.isActive} onChange={v => set('isActive', v)} />
      </Modal>
      <ConfirmDialog visible={!!del} title="Delete model?" message={`"${del?.displayName}" will stop being used by your agents.`} confirmLabel="Delete" danger onCancel={() => setDel(null)}
        onConfirm={async () => { const id = del!.id; setDel(null); try { await m.remove.mutateAsync(id); toast('Model deleted', 'success'); } catch (e) { toast((e as Error).message, 'error'); } }} />
    </Screen>
  );
}
