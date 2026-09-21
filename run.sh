#!/usr/bin/env bash
# Kabadiwala Connect — local server (macOS / Linux). Needs Python 3 or Node.js.
cd "$(dirname "$0")"
PORT=${PORT:-8090}
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$IP" ] && IP=$(ipconfig getifaddr en0 2>/dev/null)
echo
echo "  Kabadiwala Connect - local server"
echo "  ================================"
echo "  Laptop:  http://localhost:$PORT/start.html"
[ -n "$IP" ] && echo "  Phone (same Wi-Fi): http://$IP:$PORT/start.html"
echo
echo "  Press Ctrl+C to stop."
echo
( sleep 1; (xdg-open "http://localhost:$PORT/start.html" || open "http://localhost:$PORT/start.html") >/dev/null 2>&1 ) &
if command -v python3 >/dev/null; then python3 -m http.server "$PORT"
elif command -v python >/dev/null; then python -m http.server "$PORT"
elif command -v npx >/dev/null; then npx --yes serve -l "$PORT" .
else echo "Install Python 3 (https://www.python.org) or Node.js (https://nodejs.org) and run again."; fi
