#!/usr/bin/env bash
# Starts Postgres in Docker, then the API and the web app. Requires .NET 8, Node 20, Docker.
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f infrastructure/docker-compose.yml up -d db
(cd apps/api && dotnet run --project src/Chatbot.Api) &
npm install && npm run web
