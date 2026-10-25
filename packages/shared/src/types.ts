// API contracts. Keep in sync with apps/api/src/Chatbot.Application/Dtos.
export type Role = 'admin' | 'member';
export type Provider = 'openAiCompatible' | 'anthropic' | 'gemini';
export type CapabilityName = 'text' | 'vision' | 'stt' | 'tts' | 'image' | 'video';
export type MediaKind = 'image' | 'textToVideo' | 'imageToVideo';
export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

export interface AuthResponse { token: string; email: string; role: Role; displayName: string }
export interface ModelDto { id: string; displayName: string; provider: Provider; modelName: string; baseUrl: string; hasKey: boolean; priority: number; capabilities: CapabilityName[]; inputPricePer1K: number; outputPricePer1K: number; isActive: boolean }
export type ModelRequest = Omit<ModelDto, 'id' | 'hasKey'> & { apiKey?: string };
export interface AgentDto { id: string; slug: string; name: string; description: string; welcome: string; instructions: string; isLive: boolean; preferredModelId: string | null; documentCount: number }
export type AgentRequest = Pick<AgentDto, 'name' | 'description' | 'welcome' | 'instructions' | 'isLive' | 'preferredModelId'>;
export interface DocumentDto { id: string; agentId: string; fileName: string; characters: number; createdAt: string }
export interface UploadResultDto { name: string; ok: boolean; error: string | null }
export interface ArtifactDto { id: string; title: string; type: string; version: number; content: string }
export interface MessageDto { id: string; role: 'user' | 'assistant'; content: string; sources: string[]; modelName: string | null; createdAt: string; artifacts: ArtifactDto[] }
export interface ChatReplyDto { conversationId: string; message: MessageDto }
export interface ConversationDto { id: string; agentId: string; agentName: string; title: string; updatedAt: string; messageCount: number }
export interface MediaJobDto { id: string; kind: MediaKind; prompt: string; style: string; durationSeconds: number; aspectRatio: string; status: JobStatus; progress: number; resultUrl: string | null; error: string | null; estimatedCost: number; createdAt: string }
export interface VoiceDto { id: string; name: string; language: string; durationSeconds: number; createdAt: string }
export interface UsageSummaryDto { totalRequests: number; totalCost: number; mediaUsed: number; mediaQuota: number; byModel: { model: string; requests: number; cost: number }[] }
export interface PublicAgentDto { name: string; welcome: string }
