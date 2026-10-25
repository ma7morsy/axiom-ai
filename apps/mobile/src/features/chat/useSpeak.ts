import { useCallback, useRef } from 'react';
import { apiBlob } from '../../api/client';
import { playBytes } from '../../lib/audio';
import { storage } from '../../lib/storage';
import { useToast } from '../../ui';

export interface VoicePrefs { voice: string; speed: number; language: string }
export const defaultPrefs: VoicePrefs = { voice: 'alloy', speed: 1, language: 'en' };
export const loadPrefs = async (): Promise<VoicePrefs> => {
  try { return { ...defaultPrefs, ...JSON.parse((await storage.get('voice-prefs')) ?? '{}') }; } catch { return defaultPrefs; }
};

export function useSpeak() {
  const toast = useToast();
  const current = useRef<{ stop: () => void } | null>(null);
  const stop = useCallback(() => { current.current?.stop(); current.current = null; }, []);
  const speak = useCallback(async (text: string) => {
    try {
      stop();
      const p = await loadPrefs();
      const audio = await apiBlob('/speech/tts', { text: text.slice(0, 3900), voice: p.voice, speed: p.speed });
      const h = await playBytes(audio); current.current = h;
      await h.done;
    } catch (e) { toast((e as Error).message || 'Could not play audio', 'error'); }
  }, [stop, toast]);
  return { speak, stop };
}
