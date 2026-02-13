#!/bin/bash
# NHL Filter Test - Cron Wrapper
# Scheduled for February 26, 2026 (NHL resumes from Olympic Break)
#
# Olympic Break: Feb 10-25, 2026
# Regular season resumes: Feb 26, 2026

NODE_PATH="/Users/jacdejuandaniel/.nvm/versions/node/v24.13.0/bin/node"
SCRIPT_DIR="/Users/jacdejuandaniel/Project/sports-betting-ai/scripts"
LOG_DIR="/Users/jacdejuandaniel/Project/sports-betting-ai/logs"

# Create logs directory if needed
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/nhl_filter_test_$TIMESTAMP.log"

echo "=== NHL Filter Test Started at $(date) ===" >> "$LOG_FILE"
echo "Purpose: Test completed games filtering when NHL resumes from Olympic Break" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

cd "$SCRIPT_DIR/.."
"$NODE_PATH" "$SCRIPT_DIR/testNHLFilter.js" --check >> "$LOG_FILE" 2>&1

echo "" >> "$LOG_FILE"
echo "=== Completed at $(date) ===" >> "$LOG_FILE"

# Also output to terminal if running interactively
if [ -t 1 ]; then
    cat "$LOG_FILE"
fi
