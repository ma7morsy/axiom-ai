# Architecture

## Request flow
```
Request → Controller (thin) → Authentication (JWT) → Authorization (policy "Admin")
        → ValidationFilter (FluentValidation on the DTO) → Service (business logic)
        → IAppDbContext / providers → PostgreSQL / AI APIs → DTO response
Errors: ExceptionMiddleware maps AppException subclasses to JSON {status,title}; provider failures become a generic 502.
```

## Backend layers (dependencies point inward)
| Project | Responsibility | Depends on |
|---|---|---|
| Chatbot.Domain | Entities and enums only | nothing |
| Chatbot.Application | Services, DTOs, validators, interfaces, pure logic (Chunker, ArtifactParser, CostEstimator, Prompts) | Domain |
| Chatbot.Infrastructure | EF Core, Npgsql search, providers, crypto, file storage, background worker, extractors | Application |
| Chatbot.Api | Controllers, middleware, DI composition, config | Infrastructure |

## Patterns and principles
- **Strategy + Factory**: `IChatProvider` (OpenAI-compatible, Anthropic, Gemini) resolved by `IChatProviderFactory`. A new provider is one new class (Open/Closed).
- **Chain of responsibility / fallback**: `ChatRouter` tries models by priority until one answers.
- **Dependency Inversion + DI**: Application depends on interfaces (`IAppDbContext`, `IKnowledgeSearch`, `IFileStorage`, `IMediaGenerator`, `IVoiceCloneProvider`); Infrastructure implements them.
- **Single Responsibility**: one service per area (Auth, AiModel, Agent, Knowledge, Chat, Conversation, Artifact, Media, Voice, Usage). No business logic in controllers.
- **DTOs** separate API contracts from entities; mapping lives in `Mapping.cs`.
- **Data access**: services use `IAppDbContext` (EF Core is already a repository/unit of work); search is behind `IKnowledgeSearch`. A generic repository was deliberately not added.
- **Background job**: `MediaJobWorker` polls queued `MediaJob` rows.

## Retrieval ("understand intent, not just search")
1. Knowledge ≤ `App:FullContextCharLimit` (30k chars): all documents go to the model.
2. Otherwise: the model rewrites the question into a standalone query using the conversation, PostgreSQL full-text search returns the top chunks, the model answers from them only.
3. The system prompt forbids outside knowledge, handles greetings and ambiguity, replies in the customer's language, and wraps deliverables in `<artifact>` tags that are stored as versioned artifacts.

## Frontend (apps/mobile)
- `app/` expo-router routes: `login`, `(app)/chat/[id]`, `media`, `voice`, `voice-mode`, `(app)/admin/*`, public `c/[slug]`.
- `src/ui` design system (Button, Input, Select, Modal, Drawer, ConfirmDialog, Toast, Table, Tabs, Badge, EmptyState, ErrorState, Spinner, Card, Stat) driven by tokens from `@axiom/shared`; light and dark themes.
- `src/api` one fetch client and typed TanStack Query hooks; `src/features` screens' building blocks (chat, artifact panel, markdown, shell). No business rules in components.
- Responsive: phone = drawer navigation and full-screen artifact sheet; tablet = fixed sidebar; desktop (≥1100px) = sidebar + side-by-side artifact panel.
- Accessibility: roles and labels, visible focus, RTL text direction per message, live regions for status and toasts.

## Environments
Configuration through `appsettings*.json` and environment variables (`Jwt__Key`, `ConnectionStrings__Default`, ...). Development seeds data; staging and production use the same image with different variables. CI builds, tests and typechecks; the deploy job is a placeholder for your registry/host.
