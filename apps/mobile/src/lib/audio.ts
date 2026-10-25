import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface RecordedFile { uri: string; blob?: Blob; name: string; type: string }
export interface ActiveRecording { stop: () => Promise<RecordedFile> }

export async function startRecording(): Promise<ActiveRecording> {
  if (Platform.OS === 'web') {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone is not available in this browser (needs HTTPS).');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream); const chunks: Blob[] = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.start();
    return {
      stop: () => new Promise(res => {
        rec.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          res({ uri: URL.createObjectURL(blob), blob, name: 'recording.webm', type: blob.type });
        };
        rec.stop();
      })
    };
  }
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Microphone permission was denied.');
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  return {
    stop: async () => {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      return { uri: recording.getURI() ?? '', name: 'recording.m4a', type: 'audio/m4a' };
    }
  };
}

export function appendFile(form: FormData, field: string, f: RecordedFile) {
  if (f.blob) form.append(field, f.blob, f.name);
  else form.append(field, { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
}

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function playBytes(buf: ArrayBuffer): Promise<{ stop: () => void; done: Promise<void> }> {
  if (Platform.OS === 'web') {
    const a = new window.Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' })));
    const done = new Promise<void>(r => { a.onended = () => r(); a.onerror = () => r(); a.onpause = () => r(); });
    await a.play();
    return { stop: () => a.pause(), done };
  }
  const path = `${FileSystem.cacheDirectory}tts-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(path, toBase64(buf), { encoding: FileSystem.EncodingType.Base64 });
  const { sound } = await Audio.Sound.createAsync({ uri: path }, { shouldPlay: true });
  const done = new Promise<void>(r => sound.setOnPlaybackStatusUpdate(s => { if (s.isLoaded && s.didJustFinish) { sound.unloadAsync(); r(); } }));
  return { stop: () => { sound.stopAsync(); }, done };
}
