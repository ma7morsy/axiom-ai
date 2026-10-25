import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAgents, useDocumentMutations, useDocuments } from '../../../src/api/hooks';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { appendAsset, DOC_TYPES, pickFiles } from '../../../src/lib/files';
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Screen, Select, Spinner, useToast } from '../../../src/ui';

export default function Knowledge() {
  const t = useTheme();
  const toast = useToast();
  const params = useLocalSearchParams<{ agent?: string }>();
  const agents = useAgents();
  const [agentId, setAgentId] = useState<string | null>(params.agent ?? null);
  useEffect(() => { if (!agentId && agents.data?.[0]) setAgentId(agents.data[0].id); }, [agents.data, agentId]);
  const docs = useDocuments(agentId);
  const m = useDocumentMutations(agentId);
  const [del, setDel] = useState<string | null>(null);

  const upload = async () => {
    const files = await pickFiles(DOC_TYPES, true); if (!files.length) return;
    const form = new FormData(); files.forEach(f => appendAsset(form, 'files', f));
    try {
      const res = await m.upload.mutateAsync(form);
      const bad = res.filter(r => !r.ok);
      if (bad.length) toast(bad.map(b => `${b.name}: ${b.error}`).join('\n'), 'error'); else toast(`${res.length} file(s) added`, 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  return (
    <Screen title="Knowledge" subtitle="Documents your agent is allowed to answer from">
      {agents.isLoading ? <Spinner /> : !agents.data?.length ? <EmptyState icon="hardware-chip-outline" title="Create an agent first" /> : (
        <>
          <Select label="Agent" value={agentId ?? ''} onChange={setAgentId} options={agents.data.map(a => ({ value: a.id, label: a.name }))} />
          <Card title="Documents" right={<Button title="Upload" icon="cloud-upload-outline" small onPress={upload} loading={m.upload.isPending} />}>
            <Text style={{ color: t.colors.muted, fontSize: t.font.sm }}>PDF, DOCX, TXT, MD, CSV, JSON, HTML up to 15 MB each. Scanned PDFs need OCR first.</Text>
            {docs.isLoading ? <Spinner /> : docs.isError ? <ErrorState message="Could not load documents." onRetry={() => docs.refetch()} />
              : docs.data?.length ? docs.data.map(d => (
                <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.colors.border }}>
                  <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: t.colors.text, fontWeight: '600' }}>{d.fileName}</Text><Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>{Math.round(d.characters / 1000)}k characters · {new Date(d.createdAt).toLocaleDateString()}</Text></View>
                  <Button icon="trash-outline" small variant="danger" onPress={() => setDel(d.id)} accessibilityLabel={`Remove ${d.fileName}`} />
                </View>))
              : <EmptyState icon="document-outline" title="No documents yet" hint="This agent can only answer from what you upload here." />}
          </Card>
        </>)}
      <ConfirmDialog visible={!!del} title="Remove document?" message="The agent will no longer use it." confirmLabel="Remove" danger onCancel={() => setDel(null)}
        onConfirm={async () => { const id = del!; setDel(null); try { await m.remove.mutateAsync(id); toast('Removed', 'success'); } catch (e) { toast((e as Error).message, 'error'); } }} />
    </Screen>
  );
}
