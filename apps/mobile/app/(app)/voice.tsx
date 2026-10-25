import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useVoiceMutations, useVoices } from '../../src/api/hooks';
import { appendAsset, pickFiles } from '../../src/lib/files';
import { appendFile, startRecording, ActiveRecording, RecordedFile } from '../../src/lib/audio';
import { storage } from '../../src/lib/storage';
import { defaultPrefs, loadPrefs, useSpeak, VoicePrefs } from '../../src/features/chat/useSpeak';
import { Button, Card, Checkbox, ConfirmDialog, EmptyState, Input, Screen, Select, Spinner, useToast } from '../../src/ui';

const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const SPEEDS = [0.75, 1, 1.25, 1.5];
const LANGS = [{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية (Arabic)' }];

export default function VoiceSettings() {
  const t = useTheme();
  const toast = useToast();
  const { speak } = useSpeak();
  const voices = useVoices();
  const { clone, remove } = useVoiceMutations();
  const [prefs, setPrefs] = useState<VoicePrefs>(defaultPrefs);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [consent, setConsent] = useState(false);
  const [sample, setSample] = useState<{ kind: 'file'; a: DocumentPickerAsset } | { kind: 'rec'; f: RecordedFile } | null>(null);
  const [rec, setRec] = useState<ActiveRecording | null>(null);
  const [secs, setSecs] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const [del, setDel] = useState<string | null>(null);

  useEffect(() => { loadPrefs().then(setPrefs); return () => clearInterval(timer.current); }, []);
  const save = (p: VoicePrefs) => { setPrefs(p); storage.set('voice-prefs', JSON.stringify(p)); };

  const toggleRec = async () => {
    try {
      if (!rec) { setRec(await startRecording()); setSecs(0); timer.current = setInterval(() => setSecs(s => s + 1), 1000); return; }
      clearInterval(timer.current); const f = await rec.stop(); setRec(null); setSample({ kind: 'rec', f });
    } catch (e) { toast((e as Error).message, 'error'); setRec(null); }
  };
  const upload = async () => { const [a] = await pickFiles(['audio/*']); if (a) setSample({ kind: 'file', a }); };

  const doClone = async () => {
    if (!sample) return;
    const form = new FormData();
    form.append('name', name); form.append('language', language); form.append('consent', String(consent)); form.append('seconds', String(sample.kind === 'rec' ? secs : 30));
    if (sample.kind === 'rec') appendFile(form, 'file', sample.f); else appendAsset(form, 'file', sample.a);
    try { await clone.mutateAsync(form); setName(''); setSample(null); setConsent(false); toast('Voice added', 'success'); } catch (e) { toast((e as Error).message, 'error'); }
  };

  return (
    <Screen title="Voices" subtitle="Choose how replies sound, or add your own voice">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <Card style={{ flex: 1, minWidth: 300 }} title="Voice settings">
          <Select label="Voice" value={prefs.voice} onChange={v => save({ ...prefs, voice: v })} options={VOICES.map(v => ({ value: v, label: v[0]!.toUpperCase() + v.slice(1) }))} />
          <View style={{ gap: 6 }}>
            <Text style={{ color: t.colors.text, fontWeight: '600', fontSize: t.font.sm }}>Speed</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SPEEDS.map(s => (
                <Pressable key={s} onPress={() => save({ ...prefs, speed: s })} accessibilityRole="button" accessibilityState={{ selected: prefs.speed === s }}
                  style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: t.radius.pill, backgroundColor: prefs.speed === s ? t.colors.primary : t.colors.surfaceAlt }}>
                  <Text style={{ color: prefs.speed === s ? '#fff' : t.colors.text, fontWeight: '600' }}>{s}×</Text>
                </Pressable>))}
            </View>
          </View>
          <Select label="Language" value={prefs.language} onChange={v => save({ ...prefs, language: v })} options={LANGS} />
          <Button title="Preview" icon="volume-medium-outline" variant="secondary" onPress={() => speak(prefs.language === 'ar' ? 'مرحبا! هذا مثال على الصوت.' : 'Hi! This is how I will sound.')} />
        </Card>

        <Card style={{ flex: 1, minWidth: 300 }} title="Voice cloning">
          <Text style={{ color: t.colors.muted, fontSize: t.font.sm }}>Record or upload a clean 30 to 60 second sample. Only clone voices you own or have permission to use.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title={rec ? `Stop (${secs}s)` : 'Record'} icon={rec ? 'stop-circle' : 'mic-outline'} variant={rec ? 'danger' : 'secondary'} onPress={toggleRec} />
            <Button title="Upload" icon="cloud-upload-outline" variant="secondary" onPress={upload} />
          </View>
          {sample ? <Text style={{ color: t.colors.success, fontSize: t.font.sm }}>Sample ready: {sample.kind === 'file' ? sample.a.name : `recording (${secs}s)`}</Text> : null}
          <Input label="Voice name" value={name} onChangeText={setName} placeholder="My voice" maxLength={60} />
          <Select label="Language" value={language} onChange={setLanguage} options={LANGS} />
          <Checkbox checked={consent} onChange={setConsent} label="I confirm I have the consent to use this voice." />
          <Button title="Clone voice" full onPress={doClone} loading={clone.isPending} disabled={!sample || !name.trim() || !consent} />
          <Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>Cloning currently runs in demo mode until a voice provider is connected on the server.</Text>
        </Card>
      </View>
      <Card title="My voices">
        {voices.isLoading ? <Spinner /> : voices.data?.length ? voices.data.map(v => (
          <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
            <View style={{ flex: 1 }}><Text style={{ color: t.colors.text, fontWeight: '600' }}>{v.name}</Text><Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>{v.language} · {v.durationSeconds}s</Text></View>
            <Button icon="trash-outline" variant="danger" small onPress={() => setDel(v.id)} accessibilityLabel={`Delete ${v.name}`} />
          </View>)) : <EmptyState icon="mic-outline" title="No voices yet" hint="Add one above." />}
      </Card>
      <ConfirmDialog visible={!!del} title="Delete voice?" message="This also removes it from the provider." confirmLabel="Delete" danger onCancel={() => setDel(null)}
        onConfirm={async () => { const id = del!; setDel(null); try { await remove.mutateAsync(id); toast('Voice deleted', 'success'); } catch (e) { toast((e as Error).message, 'error'); } }} />
    </Screen>
  );
}
