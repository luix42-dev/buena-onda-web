#!/usr/bin/env bash
# Install a crontab entry that runs sync-products.mjs every 60 seconds.
# Run from the project root: bash scripts/install-cron.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_BIN="$(which node)"
SYNC_SCRIPT="$SCRIPT_DIR/sync-products.mjs"
LOG_FILE="$SCRIPT_DIR/.sync-log.txt"
MARKER="sync-products.mjs"

if ! command -v crontab &>/dev/null; then
  echo "Error: crontab not found. On Windows, run this inside WSL."
  exit 1
fi

# Check if already installed
if crontab -l 2>/dev/null | grep -q "$MARKER"; then
  echo "Cron entry already exists. To reinstall, run uninstall first:"
  echo "  bash scripts/uninstall-cron.sh"
  exit 0
fi

# Build cron line
CRON_LINE="* * * * * cd \"$PROJECT_DIR\" && \"$NODE_BIN\" \"$SYNC_SCRIPT\" >> \"$LOG_FILE\" 2>&1"

# Append to crontab
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo "✓ Cron installed. Sync runs every 60 seconds."
echo ""
echo "  Log:    $LOG_FILE"
echo "  Script: $SYNC_SCRIPT"
echo ""
echo "To remove later:"
echo "  bash scripts/uninstall-cron.sh"
echo ""
echo "Or manually: crontab -e  →  delete the line containing $MARKER"
