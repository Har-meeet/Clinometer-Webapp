#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required for HTTPS tunneling. Install Node.js first."
  exit 1
fi

echo "Starting local server on port $PORT..."
python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/tree-meter-local.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Starting HTTPS tunnel..."
echo "When the URL appears, open it on your phone."
echo "Press Ctrl+C to stop both."

npx --yes localtunnel --port "$PORT"
