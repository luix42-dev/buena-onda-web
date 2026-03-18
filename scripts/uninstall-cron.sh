#!/usr/bin/env bash
# Remove the sync-products crontab entry.
# Run from anywhere: bash scripts/uninstall-cron.sh

set -euo pipefail

MARKER="sync-products.mjs"

if ! command -v crontab &>/dev/null; then
  echo "Error: crontab not found."
  exit 1
fi

if ! crontab -l 2>/dev/null | grep -q "$MARKER"; then
  echo "No cron entry found for $MARKER. Nothing to remove."
  exit 0
fi

crontab -l 2>/dev/null | grep -v "$MARKER" | crontab -

echo "✓ Cron entry removed."
