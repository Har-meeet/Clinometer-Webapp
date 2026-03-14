#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

get_ip() {
  local ip=""
  if command -v ipconfig >/dev/null 2>&1; then
    ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
    if [[ -z "$ip" ]]; then
      ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
    fi
  fi
  echo "$ip"
}

IP="$(get_ip)"

echo "Serving folder: $ROOT_DIR"
echo "Port: $PORT"
echo
if [[ -n "$IP" ]]; then
  echo "Open on your phone (same Wi-Fi):"
  echo "http://$IP:$PORT"
else
  echo "Could not auto-detect LAN IP."
  echo "Run: ifconfig | grep 'inet '"
fi

echo
echo "Press Ctrl+C to stop."
cd "$ROOT_DIR"
python3 -m http.server "$PORT" --bind 0.0.0.0
