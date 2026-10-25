# Database (PostgreSQL)

All tables have `Id` (uuid PK), `CreatedAt`, `UpdatedAt`. Enums are stored as strings. Soft delete (`DeletedAt` + global query filter): AiModels, Agents, Documents, Conversations, Voices.

| Entity | Key columns | Relationships and constraints |
|---|---|---|
| Users | Email (unique), PasswordHash (bcrypt), Role | 1 → N Voices, MediaJobs |
| AiModels | Provider, ModelName, BaseUrl, ApiKeyEncrypted, Priority, Capabilities (flags), prices, IsActive | index (IsActive, Priority) |
| Agents | Slug (unique), Name, Welcome, Instructions, IsLive, PreferredModelId | N → 1 AiModel (SET NULL); 1 → N Documents |
| Documents | AgentId, FileName, Characters, Text | N → 1 Agent (CASCADE); index (AgentId, FileName) |
| DocumentChunks | DocumentId, AgentId, Position, Content | N → 1 Document (CASCADE); GIN full-text index on Content (created at startup); index AgentId |
| Conversations | AgentId, UserId or SessionId, Title | N → 1 Agent (CASCADE); index (UserId, UpdatedAt), (AgentId, SessionId) |
| Messages | ConversationId, Role, Content, Sources text[], AiModelId, tokens, Cost | N → 1 Conversation (CASCADE); index (ConversationId, CreatedAt) |
| Artifacts | ConversationId, MessageId, Title, Type | N → 1 Message (CASCADE) |
| ArtifactVersions | ArtifactId, Version, Content | unique (ArtifactId, Version) |
| UsageRecords | UserId, AgentId, AiModelId, Kind, tokens, Cost | indexes CreatedAt, AiModelId |
| Voices | UserId, Name, ProviderVoiceId, ConsentGivenAt | N → 1 User (CASCADE) |
| MediaJobs | UserId, Kind, Prompt, Status, Progress, ResultUrl, EstimatedCost | index (Status, CreatedAt), (UserId, CreatedAt) |

## Business rules
- The first registered user is Admin; later registration only when `App:AllowRegistration` is true.
- Admins manage models, agents, documents and see all conversations; members chat, use media and voices, and only see their own conversations.
- Re-uploading a document with the same name replaces it (inside a transaction, chunks are rebuilt).
- Media jobs are limited per user per month (`App:MediaMonthlyQuota`). A voice can only be cloned with explicit consent.
- Public chat is anonymous: conversations are keyed by a random session id and rate limited per IP.

## Notes
Production schema changes go through EF migrations (`scripts/add-migration.sh`). Seeding runs only when `Seed:Enabled` is true (Development). For large knowledge bases, add a `vector` column (pgvector) to DocumentChunks and implement `IKnowledgeSearch` with embeddings.
