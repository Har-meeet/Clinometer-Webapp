#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Install with: brew install cloudflared"
  exit 1
fi

echo "Starting Cloudflare quick tunnel to http://localhost:$PORT"
echo "Press Ctrl+C to stop."
cloudflared tunnel --url "http://localhost:$PORT"
