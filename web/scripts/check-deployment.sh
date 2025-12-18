#!/bin/bash
# Automated deployment verification script
# Checks the diagnostics endpoint and reports status

API_URL="${1:-https://scavengers.newbold.cloud/api}"
MAX_ATTEMPTS="${2:-10}"
DELAY="${3:-15}"

echo "🔍 Checking deployment at: $API_URL"
echo "   Max attempts: $MAX_ATTEMPTS, Delay: ${DELAY}s"
echo ""

for i in $(seq 1 $MAX_ATTEMPTS); do
  echo "Attempt $i/$MAX_ATTEMPTS..."

  RESPONSE=$(curl -s --max-time 10 "$API_URL/diagnostics" 2>&1)

  if [ $? -ne 0 ]; then
    echo "  ❌ Request failed: $RESPONSE"
    if [ $i -lt $MAX_ATTEMPTS ]; then
      echo "  Waiting ${DELAY}s before retry..."
      sleep $DELAY
    fi
    continue
  fi

  # Check if response is valid JSON
  if ! echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    echo "  ❌ Invalid JSON response"
    if [ $i -lt $MAX_ATTEMPTS ]; then
      sleep $DELAY
    fi
    continue
  fi

  # Extract status
  STATUS=$(echo "$RESPONSE" | jq -r '.overall_status')
  SUMMARY=$(echo "$RESPONSE" | jq -r '.summary')
  DB_STATUS=$(echo "$RESPONSE" | jq -r '.checks.database_connection.status')
  DB_MESSAGE=$(echo "$RESPONSE" | jq -r '.checks.database_connection.message')

  echo "  Overall: $STATUS"
  echo "  Summary: $SUMMARY"
  echo "  Database: $DB_STATUS - $DB_MESSAGE"

  if [ "$STATUS" = "ok" ]; then
    echo ""
    echo "✅ Deployment verified successfully!"
    echo "$RESPONSE" | jq '.checks'
    exit 0
  elif [ "$DB_STATUS" = "ok" ]; then
    echo ""
    echo "✅ Database connected! (some warnings may exist)"
    echo "$RESPONSE" | jq '.checks'
    exit 0
  else
    echo "  Status not OK yet..."
    if [ $i -lt $MAX_ATTEMPTS ]; then
      echo "  Waiting ${DELAY}s for deployment to update..."
      sleep $DELAY
    fi
  fi
done

echo ""
echo "❌ Deployment verification failed after $MAX_ATTEMPTS attempts"
echo "Last response:"
echo "$RESPONSE" | jq '.'
exit 1
