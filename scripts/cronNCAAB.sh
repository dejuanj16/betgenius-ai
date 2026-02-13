#!/bin/bash
# NCAAB Props Monitor - Cron Wrapper
# Scheduled for game times: 8-9 PM EST

NODE_PATH="/Users/jacdejuandaniel/.nvm/versions/node/v24.13.0/bin/node"
SCRIPT_DIR="/Users/jacdejuandaniel/Project/sports-betting-ai/scripts"
LOG_DIR="/Users/jacdejuandaniel/Project/sports-betting-ai/logs"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/ncaab_monitor_$TIMESTAMP.log"

echo "=== NCAAB Monitor Started at $(date) ===" >> "$LOG_FILE"
cd "$SCRIPT_DIR/.."
"$NODE_PATH" "$SCRIPT_DIR/monitorNCAAB.js" >> "$LOG_FILE" 2>&1
echo "=== Completed at $(date) ===" >> "$LOG_FILE"
