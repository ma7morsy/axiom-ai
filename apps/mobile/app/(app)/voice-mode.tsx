import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAgents, useSendMessage } from '../../src/api/hooks';
import { api, apiBlob } from '../../src/api/client';
import { appendFile, playBytes, startRecording, ActiveRecording } from '../../src/lib/audio';
import { loadPrefs } from '../../src/features/chat/useSpeak';
import { Button, useToast } from '../../src/ui';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';
const label: Record<Phase, string> = { idle: 'Tap to speak', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…' };

export default function VoiceMode() {
  const router = useRouter();
  const toast = useToast();
  const agents = useAgents();
  const send = useSendMessage();
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState('');
  const rec = useRef<ActiveRecording | null>(null);
  const playing = useRef<{ stop: () => void } | null>(null);
  const convId = useRef<string | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const agent = agents.data?.find(a => a.isLive);

  useEffect(() => {
    if (phase === 'idle') { pulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: phase === 'listening' ? 1.12 : 1.06, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true })]));
    loop.start(); return () => loop.stop();
  }, [phase, pulse]);
  useEffect(() => () => { playing.current?.stop(); }, []);

  const tap = async () => {
    try {
      if (phase === 'speaking') { playing.current?.stop(); setPhase('idle'); return; }
      if (phase === 'thinking') return;
      if (phase === 'idle') { rec.current = await startRecording(); setPhase('listening'); return; }
      setPhase('thinking');
      const file = await rec.current!.stop(); rec.current = null;
      const form = new FormData(); appendFile(form, 'file', file);
      const { text } = await api<{ text: string }>('/speech/stt', { form });
      if (!text.trim()) { setPhase('idle'); return; }
      setHeard(text);
      if (!agent) throw new Error('No agent is available.');
      const reply = await send.mutateAsync({ agentId: agent.id, conversationId: convId.current, message: text });
      convId.current = reply.conversationId;
      const prefs = await loadPrefs();
      const audio = await apiBlob('/speech/tts', { text: reply.message.content.slice(0, 3900), voice: prefs.voice, speed: prefs.speed });
      setPhase('speaking');
      const h = await playBytes(audio); playing.current = h; await h.done;
      setPhase('idle');
    } catch (e) { toast((e as Error).message, 'error'); rec.current = null; setPhase('idle'); }
  };

  return (
    <LinearGradient colors={['#0A0B1E', '#1E1B6B', '#2B1B5E']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 28 }}>
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>{label[phase]}</Text>
      <Text numberOfLines={2} style={{ color: '#C7CAF5', textAlign: 'center', minHeight: 40, maxWidth: 420 }}>{heard || (agent ? `Talking to ${agent.name}` : '')}</Text>
      <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel={label[phase]}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <LinearGradient colors={['#93C5FD', '#4F46E5', '#7C3AED']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={phase === 'listening' ? 'stop' : phase === 'speaking' ? 'volume-high' : 'mic'} size={56} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Button title="End" icon="call" variant="danger" onPress={() => { playing.current?.stop(); router.replace('/chat/new'); }} />
      </View>
    </LinearGradient>
  );
}
