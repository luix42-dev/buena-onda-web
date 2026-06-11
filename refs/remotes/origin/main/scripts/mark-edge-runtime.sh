#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

find app -path '*/route.ts' -print | while read -r file; do
  if grep -q 'export const runtime' "$file"; then
    sed -i "s/export const runtime = ['\"]nodejs['\"]/export const runtime = 'edge'/" "$file"
  else
    tmp="$(mktemp)"
    printf "export const runtime = 'edge'\n" > "$tmp"
    cat "$file" >> "$tmp"
    mv "$tmp" "$file"
  fi
done
