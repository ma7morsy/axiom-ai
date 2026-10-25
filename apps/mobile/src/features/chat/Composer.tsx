import React, { useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, IconButton, useToast } from '../../ui';
import { api } from '../../api/client';
import { appendFile, startRecording, ActiveRecording } from '../../lib/audio';

export function Composer({ onSend, busy, tools = true, voice = true, placeholder = 'Ask anything…' }: { onSend: (text: string) => void; busy: boolean; tools?: boolean; voice?: boolean; placeholder?: string }) {
  const t = useTheme();
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [rec, setRec] = useState<ActiveRecording | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const input = useRef<TextInput>(null);

  const send = () => { const v = text.trim(); if (!v || busy) return; setText(''); onSend(v); };
  const toggleMic = async () => {
    try {
      if (!rec) { setRec(await startRecording()); return; }
      const r = rec; setRec(null); setTranscribing(true);
      const file = await r.stop(); const form = new FormData(); appendFile(form, 'file', file);
      const res = await api<{ text: string }>('/speech/stt', { form });
      setText(p => (p ? p + ' ' : '') + res.text);
      input.current?.focus();
    } catch (e) { toast((e as Error).message, 'error'); setRec(null); }
    setTranscribing(false);
  };
  const go = (path: string) => { setMenu(false); router.push(path as never); };

  return (
    <View style={{ padding: 12, backgroundColor: t.colors.bg }}>
      {menu ? (
        <View style={{ alignSelf: 'flex-start', backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, marginBottom: 6, minWidth: 150 }}>
          {([['image-outline', 'Image', '/media'], ['videocam-outline', 'Video', '/media'], ['mic-outline', 'Voice', '/voice-mode']] as const).map(([icon, label, path]) => (
            <Pressable key={label} onPress={() => go(path)} accessibilityRole="menuitem" style={{ flexDirection: 'row', gap: 10, padding: 11, alignItems: 'center' }}>
              <Ionicons name={icon} size={18} color={t.colors.primary} /><Text style={{ color: t.colors.text }}>{label}</Text>
            </Pressable>))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: 8, paddingVertical: 6 }}>
        {tools ? <IconButton icon={menu ? 'close' : 'add'} label="More tools" size={24} color={t.colors.primary} onPress={() => setMenu(m => !m)} /> : null}
        <TextInput
          ref={input} value={text} onChangeText={setText} placeholder={rec ? 'Listening… tap the mic to stop' : transcribing ? 'Transcribing…' : placeholder} placeholderTextColor={t.colors.muted}
          multiline accessibilityLabel="Message" {...({ dir: "auto" } as object)} maxLength={4000}
          onKeyPress={(e: any) => { if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
          style={{ flex: 1, color: t.colors.text, fontSize: t.font.md, maxHeight: 140, paddingVertical: 8, paddingHorizontal: 6, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}) }}
        />
        {voice ? <IconButton icon={rec ? 'stop-circle' : 'mic-outline'} label={rec ? 'Stop recording' : 'Dictate'} size={22} color={rec ? t.colors.danger : t.colors.muted} onPress={toggleMic} /> : null}
        <Button icon="arrow-up" onPress={send} disabled={!text.trim() || busy} accessibilityLabel="Send" />
      </View>
    </View>
  );
}
