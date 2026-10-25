import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as T from '@axiom/shared';
import { api } from './client';

const qk = { agents: ['agents'], models: ['models'], convos: ['convos'], usage: ['usage'], jobs: ['jobs'], voices: ['voices'] };
const inv = (qc: ReturnType<typeof useQueryClient>, ...keys: string[][]) => keys.forEach(k => qc.invalidateQueries({ queryKey: k }));

export const useAgents = () => useQuery({ queryKey: qk.agents, queryFn: () => api<T.AgentDto[]>('/agents') });
export const useModels = () => useQuery({ queryKey: qk.models, queryFn: () => api<T.ModelDto[]>('/models') });
export const useConversations = () => useQuery({ queryKey: qk.convos, queryFn: () => api<T.ConversationDto[]>('/conversations') });
export const useAdminConversations = () => useQuery({ queryKey: ['admin-convos'], queryFn: () => api<T.ConversationDto[]>('/admin/conversations') });
export const useMessages = (id: string | null, admin = false) => useQuery({
  queryKey: ['messages', id, admin], enabled: !!id,
  queryFn: () => api<T.MessageDto[]>(admin ? `/admin/conversations/${id}/messages` : `/conversations/${id}/messages`)
});
export const useDocuments = (agentId: string | null) => useQuery({ queryKey: ['docs', agentId], enabled: !!agentId, queryFn: () => api<T.DocumentDto[]>(`/agents/${agentId}/documents`) });
export const useUsage = () => useQuery({ queryKey: qk.usage, queryFn: () => api<T.UsageSummaryDto>('/usage') });
export const useJobs = () => useQuery({
  queryKey: qk.jobs, queryFn: () => api<T.MediaJobDto[]>('/media/jobs'),
  refetchInterval: q => (q.state.data?.some(j => j.status === 'queued' || j.status === 'running') ? 2500 : false)
});
export const useVoices = () => useQuery({ queryKey: qk.voices, queryFn: () => api<T.VoiceDto[]>('/voices') });
export const useEstimate = (kind: T.MediaKind, seconds: number) => useQuery({ queryKey: ['estimate', kind, seconds], queryFn: () => api<{ cost: number }>(`/media/estimate?kind=${kind}&seconds=${seconds}`) });

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: { agentId: string; conversationId: string | null; message: string }) => api<T.ChatReplyDto>('/chat', { body: r }),
    onSuccess: () => inv(qc, qk.convos)
  });
}
export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/conversations/${id}`, { method: 'DELETE' }), onSuccess: () => inv(qc, qk.convos) });
}
export function useModelMutations() {
  const qc = useQueryClient();
  const done = () => inv(qc, qk.models);
  return {
    create: useMutation({ mutationFn: (r: T.ModelRequest) => api<T.ModelDto>('/models', { body: r }), onSuccess: done }),
    update: useMutation({ mutationFn: (v: { id: string; r: T.ModelRequest }) => api<T.ModelDto>(`/models/${v.id}`, { method: 'PUT', body: v.r }), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => api(`/models/${id}`, { method: 'DELETE' }), onSuccess: done }),
    test: useMutation({ mutationFn: (id: string) => api<{ ok: boolean; message: string }>(`/models/${id}/test`, { method: 'POST', body: {} }) })
  };
}
export function useAgentMutations() {
  const qc = useQueryClient();
  const done = () => inv(qc, qk.agents);
  return {
    create: useMutation({ mutationFn: (r: T.AgentRequest) => api<T.AgentDto>('/agents', { body: r }), onSuccess: done }),
    update: useMutation({ mutationFn: (v: { id: string; r: T.AgentRequest }) => api<T.AgentDto>(`/agents/${v.id}`, { method: 'PUT', body: v.r }), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => api(`/agents/${id}`, { method: 'DELETE' }), onSuccess: done })
  };
}
export function useDocumentMutations(agentId: string | null) {
  const qc = useQueryClient();
  const done = () => { qc.invalidateQueries({ queryKey: ['docs', agentId] }); inv(qc, qk.agents); };
  return {
    upload: useMutation({ mutationFn: (form: FormData) => api<T.UploadResultDto[]>(`/agents/${agentId}/documents`, { form }), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => api(`/documents/${id}`, { method: 'DELETE' }), onSuccess: done })
  };
}
export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (form: FormData) => api<T.MediaJobDto>('/media/jobs', { form }), onSuccess: () => inv(qc, qk.jobs) });
}
export function useVoiceMutations() {
  const qc = useQueryClient();
  return {
    clone: useMutation({ mutationFn: (form: FormData) => api<T.VoiceDto>('/voices', { form }), onSuccess: () => inv(qc, qk.voices) }),
    remove: useMutation({ mutationFn: (id: string) => api(`/voices/${id}`, { method: 'DELETE' }), onSuccess: () => inv(qc, qk.voices) })
  };
}
export const reviseArtifact = (id: string, instruction: string) => api<T.ArtifactDto>(`/artifacts/${id}/revise`, { body: { instruction } });
