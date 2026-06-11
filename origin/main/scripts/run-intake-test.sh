#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/home/luix4/.nvm/versions/node/v20.20.2/bin:$PATH"

url="${1:?Instagram URL is required}"
body_file="/tmp/bo-intake.json"
log_file="/tmp/bo-intake-dev.log"
response_file="/tmp/bo-intake-response.json"

node -e "const fs=require('fs'); fs.writeFileSync(process.argv[2], JSON.stringify({ url: process.argv[1] }))" "$url" "$body_file"

npm run dev >"$log_file" 2>&1 &
server_pid=$!

cleanup() {
  kill "$server_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 40); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/studio/login; then
    break
  fi
  sleep 1
done

cat "$log_file"
echo INTAKE_RESPONSE
curl -sS -X POST \
  -H 'content-type: application/json' \
  --data @"$body_file" \
  http://127.0.0.1:3000/api/intake \
  | tee "$response_file"

echo
echo RESPONSE_FILE="$response_file"
