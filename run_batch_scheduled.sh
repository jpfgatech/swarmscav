#!/bin/bash
# Scheduled batch runner script
# This script runs the batch simulation and logs output

cd "$(dirname "$0")"
LOG_FILE="output/batch_scheduled_$(date +%Y%m%d_%H%M%S).log"

echo "============================================================" >> "$LOG_FILE"
echo "Scheduled Batch Run Started: $(date)" >> "$LOG_FILE"
echo "============================================================" >> "$LOG_FILE"

npm run batch >> "$LOG_FILE" 2>&1

echo "" >> "$LOG_FILE"
echo "============================================================" >> "$LOG_FILE"
echo "Scheduled Batch Run Completed: $(date)" >> "$LOG_FILE"
echo "============================================================" >> "$LOG_FILE"
