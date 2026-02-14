#!/bin/bash
# Daily email migration analysis
# Add to crontab with: crontab -e
# Example: 0 6 * * * /home/sab/projects/email-migration-tracker/scripts/daily-analyze.sh

set -e

PROJECT_DIR="/home/sab/projects/email-migration-tracker"
LOG_FILE="$PROJECT_DIR/logs/analyze-$(date +%Y-%m-%d).log"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Run the analysis
cd "$PROJECT_DIR"

echo "========================================" >> "$LOG_FILE"
echo "Starting analysis at $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

/usr/bin/npm run analyze-emails >> "$LOG_FILE" 2>&1

echo "Completed at $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Optional: Rebuild the Next.js app to refresh data
# Uncomment the line below if you want automatic rebuilds
# /usr/bin/npm run build >> "$LOG_FILE" 2>&1

# Optional: Send notification (requires notify-send or similar)
# notify-send "Email Migration" "Daily analysis complete. Check $LOG_FILE"
