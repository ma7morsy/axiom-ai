import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCost, type MediaJobDto, type MediaKind } from '@axiom/shared';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useCreateJob, useEstimate, useJobs } from '../../src/api/hooks';
import { fileUrl } from '../../src/api/client';
import { appendAsset, pickFiles } from '../../src/lib/files';
import { Badge, Button, Card, EmptyState, ErrorState, Input, ProgressBar, Screen, Segmented, Select, Spinner, useToast } from '../../src/ui';
import type { DocumentPickerAsset } from 'expo-document-picker';

const kinds = [{ value: 'image' as MediaKind, label: 'Image' }, { value: 'textToVideo' as MediaKind, label: 'Text to video' }, { value: 'imageToVideo' as MediaKind, label: 'Image to video' }];

function JobCard({ job }: { job: MediaJobDto }) {
  const t = useTheme();
  const tone = job.status === 'done' ? 'success' : job.status === 'failed' ? 'danger' : 'info';
  const url = fileUrl(job.resultUrl);
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8 }}>
      <LinearGradient colors={[t.colors.accent, t.colors.info]} style={{ width: 64, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={job.kind === 'image' ? 'image-outline' : 'videocam-outline'} size={22} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1, gap: 4 }}>
        <Text numberOfLines={1} style={{ color: t.colors.text, fontWeight: '600' }}>{job.prompt}</Text>
        {job.status === 'running' || job.status === 'queued' ? <ProgressBar value={job.progress} /> : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge label={job.status === 'running' ? `Running ${job.progress}%` : job.status} tone={tone} />
          {job.resultUrl?.startsWith('simulated://') ? <Badge label="Simulated" tone="neutral" /> : null}
          <Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>{formatCost(job.estimatedCost)}</Text>
        </View>
        {job.error ? <Text style={{ color: t.colors.danger, fontSize: t.font.xs }}>{job.error}</Text> : null}
      </View>
      {url && !url.startsWith('simulated://') ? <Button title="Open" small variant="secondary" onPress={() => Linking.openURL(url)} /> : null}
    </View>
  );
}

export default function Media() {
  const t = useTheme();
  const toast = useToast();
  const jobs = useJobs();
  const create = useCreateJob();
  const [kind, setKind] = useState<MediaKind>('image');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [seconds, setSeconds] = useState('5');
  const [aspect, setAspect] = useState('16:9');
  const [file, setFile] = useState<DocumentPickerAsset | null>(null);
  const est = useEstimate(kind, Number(seconds));

  const submit = async () => {
    const form = new FormData();
    form.append('kind', kind); form.append('prompt', prompt); form.append('style', style);
    form.append('durationSeconds', kind === 'image' ? '1' : seconds); form.append('aspectRatio', aspect);
    if (file && kind === 'imageToVideo') appendAsset(form, 'file', file);
    try { await create.mutateAsync(form); setPrompt(''); toast('Added to your jobs', 'success'); } catch (e) { toast((e as Error).message, 'error'); }
  };
  const pick = async () => { const [a] = await pickFiles(['image/*']); if (a) setFile(a); };

  return (
    <Screen title="Media studio" subtitle="Create images and videos from text or a reference image">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <Card style={{ flex: 1, minWidth: 300 }} title="Create">
          <Segmented value={kind} options={kinds} onChange={setKind} />
          <Input label="Prompt" multiline value={prompt} onChangeText={setPrompt} placeholder="A modern workspace with a laptop, coffee and plants, soft morning light" maxLength={1000} />
          {kind === 'imageToVideo' ? (
            <Button title={file ? file.name : 'Upload an image'} icon="image-outline" variant="secondary" onPress={pick} />
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Select label="Style" value={style} onChange={setStyle} options={['realistic', 'cinematic', 'anime', 'illustration', '3d'].map(v => ({ value: v, label: v }))} /></View>
            {kind !== 'image' ? <View style={{ flex: 1 }}><Select label="Duration" value={seconds} onChange={setSeconds} options={['3', '5', '10', '15'].map(v => ({ value: v, label: `${v}s` }))} /></View> : null}
            <View style={{ flex: 1 }}><Select label="Aspect ratio" value={aspect} onChange={setAspect} options={['16:9', '9:16', '1:1', '4:3'].map(v => ({ value: v, label: v }))} /></View>
          </View>
          <Text style={{ color: t.colors.muted, fontSize: t.font.sm }}>Estimated cost: <Text style={{ fontWeight: '700', color: t.colors.text }}>{est.data ? formatCost(est.data.cost) : '…'}</Text></Text>
          <Button title="Generate" icon="sparkles" full onPress={submit} loading={create.isPending} disabled={!prompt.trim() || (kind === 'imageToVideo' && !file)} />
        </Card>
        <Card style={{ flex: 1, minWidth: 300 }} title="Recent jobs">
          {jobs.isLoading ? <Spinner /> : jobs.isError ? <ErrorState onRetry={() => jobs.refetch()} message="Could not load your jobs." />
            : jobs.data?.length ? jobs.data.map(j => <JobCard key={j.id} job={j} />) : <EmptyState icon="film-outline" title="No jobs yet" hint="Be the first to add something." />}
        </Card>
      </View>
    </Screen>
  );
}
