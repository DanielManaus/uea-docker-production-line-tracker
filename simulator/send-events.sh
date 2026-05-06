#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://api:3000}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-5}"
count=1

echo "simulator started, sending events to ${API_URL}"

while true; do
  if [ $((count % 2)) -eq 0 ]; then
    source="KIC"
    oven="KIC-PROFILE-01"
  else
    source="HELLER"
    oven="HELLER-OVEN-01"
  fi

  temp=$((170 + (count * 7 % 90)))
  status="INFO"
  event_type="TEMPERATURE_READING"

  if [ "$temp" -gt 240 ]; then
    status="CRITICAL"
    event_type="ALARM"
  elif [ "$temp" -gt 220 ]; then
    status="WARNING"
  fi

  payload=$(cat <<EOF
{
  "source": "${source}",
  "lineId": "LINE-01",
  "ovenId": "${oven}",
  "eventType": "${event_type}",
  "status": "${status}",
  "temperatureC": ${temp},
  "description": "Evento simulado ${count}",
  "occurredAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)

  http_code=$(curl -s -o /tmp/response.txt -w "%{http_code}" \
    -X POST "${API_URL}/api/events" \
    -H "Content-Type: application/json" \
    -d "${payload}" || true)

  echo "sent_event count=${count} source=${source} status=${status} temp=${temp} http=${http_code}"

  count=$((count + 1))
  sleep "${INTERVAL_SECONDS}"
done
