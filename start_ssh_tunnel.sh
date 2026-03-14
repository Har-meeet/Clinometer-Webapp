#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8002}"

if ! command -v ssh >/dev/null 2>&1; then
  echo "ssh is required but not found."
  exit 1
fi

echo "Starting local server on 127.0.0.1:$PORT..."
python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/tree-meter-local.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Creating HTTPS tunnel..."
echo "Press Ctrl+C to stop."
ssh -o StrictHostKeyChecking=accept-new -R 80:localhost:"$PORT" nokey@localhost.run
