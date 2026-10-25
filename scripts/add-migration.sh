#!/usr/bin/env bash
# Usage: scripts/add-migration.sh InitialCreate   (requires: dotnet tool install -g dotnet-ef)
set -euo pipefail
cd "$(dirname "$0")/../apps/api"
dotnet ef migrations add "${1:?migration name}" -p src/Chatbot.Infrastructure -s src/Chatbot.Api -o Persistence/Migrations
