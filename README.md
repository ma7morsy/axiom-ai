# Axiom AI

Chat with any AI model API, grounded in your own documents. Admin console, public customer chat, voice, media studio and artifacts.

| Layer | Stack |
|---|---|
| API | C# / ASP.NET Core 8, EF Core 8, PostgreSQL, FluentValidation, JWT, built-in rate limiting |
| App | React Native (Expo, expo-router) for iOS, Android and web, TypeScript, TanStack Query |
| Shared | `packages/shared`: API types, design tokens, pure helpers (unit tested) |
| Infra | Docker Compose, Dockerfiles, GitHub Actions CI |

```
apps/api            .NET solution: Domain, Application, Infrastructure, Api, Tests
apps/mobile         Expo app (responsive: phone drawer, tablet/desktop sidebar + artifact panel)
packages/shared     types, tokens, format helpers
infrastructure      docker-compose.yml
docs                architecture.md, database.md
scripts             dev.sh, add-migration.sh
```

## Run locally
Requires .NET 8 SDK, Node 20, Docker (for Postgres).

```bash
docker compose -f infrastructure/docker-compose.yml up -d db
cd apps/api && dotnet run --project src/Chatbot.Api     # http://localhost:5080  (Swagger at /swagger)
# new terminal, repo root:
npm install && npm run web                              # http://localhost:8081
```
Development seeds an admin: `admin@axiom.local` / `ChangeMe123!` and a "General Assistant" agent. Change it, or register (the first account is always admin).

Then in the app: **Admin > Models** (add a model and key, press Test) → **Admin > Knowledge** (upload documents) → chat. Customers use `/c/<slug>` (copy it from **Admin > Agents**).

Phones: set `EXPO_PUBLIC_API_URL=http://<your-computer-ip>:5080`, run `npm start`, scan the QR code.

## Everything in Docker
```bash
cp .env.example .env   # fill JWT_KEY and ENCRYPTION_KEY (openssl rand -hex 32)
docker compose -f infrastructure/docker-compose.yml --env-file .env up --build
```
App on :8081, API on :5080.

## Database migrations
No migration files are committed yet. Until you create them, the API creates the schema on first start (and logs a warning). Create the first migration, commit it, and from then on startup applies migrations:
```bash
dotnet tool install -g dotnet-ef
scripts/add-migration.sh InitialCreate
```

## Deploy
See `docs/deploy.md` (Render blueprint `render.yaml` for the API and database, Cloudflare Pages for the web app).

## Tests and CI
`dotnet test apps/api/Chatbot.sln` · `npm test` · `npm run typecheck` · `npm run build:web`. CI runs all of them (`.github/workflows/ci.yml`).

## What is real and what is a placeholder
- Real: auth, roles, model registry with encrypted keys and priority fallback, OpenAI-compatible/Anthropic/Gemini chat, document upload (PDF, DOCX, text), intent rewrite + full-text retrieval, grounded answers, artifacts with versions and revise, conversations, usage and cost, public rate-limited chat, speech-to-text and text-to-speech through OpenAI-compatible audio endpoints.
- Placeholder (clearly marked "Simulated" in the UI): image/video generation (`SimulatedMediaGenerator`) and voice cloning (`SimulatedVoiceCloneProvider`). Implement `IMediaGenerator` / `IVoiceCloneProvider` for your vendor and register it in `Chatbot.Infrastructure/DependencyInjection.cs`.
- Not built yet: token streaming, embeddings/pgvector search, refresh tokens, email invites for members.

## Security notes
Provider keys are AES-GCM encrypted in the database and never returned to clients. Artifact HTML renders in a sandboxed iframe with scripts disabled. Uploaded media is served from `/files` under unguessable names; move to private object storage with signed URLs before storing sensitive media. Set strong `Jwt__Key` and `Security__EncryptionKey` and keep `Security__EncryptionKey` stable.
