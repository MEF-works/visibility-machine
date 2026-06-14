#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/apps/visibility-machine"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.production.example and set GEMINI_API_KEY"
  exit 1
fi

mkdir -p data/uploads

docker compose build --no-cache
docker compose up -d

echo "Waiting for health..."
for i in {1..30}; do
  if docker compose exec -T visibility-machine node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" 2>/dev/null; then
    echo "Container healthy"
    exit 0
  fi
  sleep 2
done

echo "Health check timed out — check: docker compose logs visibility-machine"
exit 1
