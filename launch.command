#!/bin/zsh
set -eu
CONSOLE_DIR="${0:A:h}"
NODE_BIN="${UOOC_NODE:-$(command -v node || true)}"
if [[ -z "$NODE_BIN" ]]; then
  candidates=("$HOME"/.local/node-v24*-darwin-*/bin/node(N))
  NODE_BIN="${candidates[1]:-}"
fi
[[ -x "$NODE_BIN" ]] || { echo "请安装 Node.js 24，或设置 UOOC_NODE"; exit 1; }
CONSOLE_URL="http://127.0.0.1:4319"
if ! /usr/bin/curl --silent --fail --max-time 2 "$CONSOLE_URL" >/dev/null; then
  LOG_DIR="$HOME/30_Developer/uooc-console-runtime"
  /bin/mkdir -p "$LOG_DIR"
  cd "$CONSOLE_DIR"
  /usr/bin/nohup "$NODE_BIN" server.cjs >> "$LOG_DIR/server.log" 2>&1 </dev/null &
  for attempt in {1..30}; do
    if /usr/bin/curl --silent --fail --max-time 1 "$CONSOLE_URL" >/dev/null; then break; fi
    /bin/sleep 0.3
  done
fi
/usr/bin/curl --silent --fail --max-time 2 "$CONSOLE_URL" >/dev/null || { echo '控制台启动失败，请查看 ~/30_Developer/uooc-console-runtime/server.log'; exit 1; }
/usr/bin/open "$CONSOLE_URL"
