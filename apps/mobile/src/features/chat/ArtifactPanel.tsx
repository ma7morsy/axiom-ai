import React, { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { ArtifactDto } from '@axiom/shared';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, IconButton, Input, Tabs, useToast } from '../../ui';
import { Markdown } from '../Markdown';
import HtmlPreview from '../HtmlPreview';
import { reviseArtifact } from '../../api/hooks';

const extFor = (type: string) => ({ html: 'html', svg: 'svg', markdown: 'md', code: 'txt' } as Record<string, string>)[type] ?? 'txt';

export function ArtifactPanel({ artifact, onChange, onClose }: { artifact: ArtifactDto; onChange: (a: ArtifactDto) => void; onClose: () => void }) {
  const t = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [ask, setAsk] = useState('');
  const [busy, setBusy] = useState(false);
  const visual = artifact.type === 'html' || artifact.type === 'svg';

  const revise = async () => {
    if (!ask.trim()) return;
    setBusy(true);
    try { onChange(await reviseArtifact(artifact.id, ask.trim())); setAsk(''); }
    catch (e) { toast((e as Error).message, 'error'); }
    setBusy(false);
  };
  const download = () => {
    if (Platform.OS !== 'web') { Clipboard.setStringAsync(artifact.content); toast('Copied to clipboard', 'success'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([artifact.content], { type: 'text/plain' }));
    a.download = `${artifact.title.replace(/[^\w-]+/g, '_')}.${extFor(artifact.type)}`; a.click();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 4, borderBottomWidth: 1, borderBottomColor: t.colors.border }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: t.colors.text, fontWeight: '800', fontSize: t.font.lg }}>{artifact.title}</Text>
          <Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>v{artifact.version} · {artifact.type}</Text>
        </View>
        <IconButton icon="copy-outline" label="Copy" onPress={async () => { await Clipboard.setStringAsync(artifact.content); toast('Copied', 'success'); }} />
        <IconButton icon="download-outline" label="Download" onPress={download} />
        <IconButton icon="close" label="Close panel" onPress={onClose} />
      </View>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'preview', label: 'Preview' }, { value: 'code', label: 'Code' }]} />
      <View style={{ flex: 1 }}>
        {tab === 'code' ? <ScrollView contentContainerStyle={{ padding: 14 }}><Text selectable style={{ color: t.colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 }}>{artifact.content}</Text></ScrollView>
          : visual ? <View style={{ flex: 1, padding: 10 }}><HtmlPreview html={artifact.type === 'svg' ? `<body style="margin:0">${artifact.content}</body>` : artifact.content} /></View>
          : <ScrollView contentContainerStyle={{ padding: 16 }}><Markdown text={artifact.type === 'code' ? '```\n' + artifact.content + '\n```' : artifact.content} /></ScrollView>}
      </View>
      <View style={{ padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: t.colors.border }}>
        <View style={{ flex: 1 }}><Input placeholder="Ask for a change…" value={ask} onChangeText={setAsk} onSubmitEditing={revise} editable={!busy} /></View>
        <Button icon="arrow-forward" onPress={revise} loading={busy} accessibilityLabel="Apply change" />
      </View>
    </View>
  );
}
