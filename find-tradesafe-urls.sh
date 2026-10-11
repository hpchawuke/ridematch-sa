#!/usr/bin/env bash
# Finds which TradeSafe auth + API addresses work for YOUR credentials, and
# lists your account's tokens so you can pick the platform token ID.
# Run it in your own terminal. Your secret is typed locally, never printed,
# and only sent to the TradeSafe addresses listed below.

read -r -p "TradeSafe Client ID: " CID
read -r -s -p "TradeSafe Client Secret (hidden): " CS
echo

AUTH_CANDIDATES=(
  "https://auth.tradesafe.co.za/oauth/token"
  "https://auth.tradesafe.dev/oauth/token"
  "https://auth-sandbox.tradesafe.dev/oauth/token"
  "https://auth-developer.tradesafe.dev/oauth/token"
)
API_CANDIDATES=(
  "https://api.tradesafe.co.za/graphql"
  "https://api-developer.tradesafe.dev/graphql"
  "https://api.tradesafe.dev/graphql"
)

WORKING_AUTH=""
TOKEN=""
echo
echo "== Auth addresses =="
for AUTH in "${AUTH_CANDIDATES[@]}"; do
  RESP=$(curl -s -m 15 -w '\n%{http_code}' -X POST "$AUTH" \
    -H 'content-type: application/x-www-form-urlencoded' \
    --data-urlencode grant_type=client_credentials \
    --data-urlencode "client_id=$CID" \
    --data-urlencode "client_secret=$CS")
  CODE=$(echo "$RESP" | tail -n1)
  BODY=$(echo "$RESP" | sed '$d')
  T=$(echo "$BODY" | python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("access_token",""))
except Exception: print("")' 2>/dev/null)
  if [ -n "$T" ]; then
    echo "WORKS    $AUTH"
    if [ -z "$WORKING_AUTH" ]; then WORKING_AUTH="$AUTH"; TOKEN="$T"; fi
  else
    echo "no ($CODE) $AUTH"
  fi
done

if [ -z "$TOKEN" ]; then
  echo
  echo "None of these accepted your credentials. Check the Client ID/Secret, and look in your"
  echo "TradeSafe dashboard or docs for the sandbox auth address. If curl said 000, the address"
  echo "does not exist (or your network is down)."
  exit 1
fi

echo
echo "== API addresses (using the working auth address) =="
WORKING_API=""
for API in "${API_CANDIDATES[@]}"; do
  # First try apiProfile (your organisation's own token)
  RESP=$(curl -s -m 15 -w '\n%{http_code}' -X POST "$API" \
    -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d '{"query":"query { apiProfile { name token } }"}')
  CODE=$(echo "$RESP" | tail -n1)
  BODY=$(echo "$RESP" | sed '$d')
  if echo "$BODY" | grep -q '"apiProfile"'; then
    echo "WORKS    $API"
    if [ -z "$WORKING_API" ]; then
      WORKING_API="$API"
      echo
      echo "== apiProfile (the \"token\" value is your platform token ID) =="
      echo "$BODY" | python3 -m json.tool
    fi
    continue
  fi

  # Fall back to the token list
  RESP=$(curl -s -m 15 -w '\n%{http_code}' -X POST "$API" \
    -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d '{"query":"query { tokens { data { id name reference } } }"}')
  CODE=$(echo "$RESP" | tail -n1)
  BODY=$(echo "$RESP" | sed '$d')
  if echo "$BODY" | grep -q '"tokens"'; then
    echo "WORKS    $API (apiProfile not available, showing token list)"
    if [ -z "$WORKING_API" ]; then
      WORKING_API="$API"
      echo
      echo "== Your account's tokens (the platform token is your own company's entry) =="
      echo "$BODY" | python3 -m json.tool
    fi
  else
    echo "no ($CODE) $API"
  fi
done

echo
echo "== Use these =="
echo "TRADESAFE_AUTH_URL = $WORKING_AUTH"
echo "TRADESAFE_API_URL  = ${WORKING_API:-(none worked, see above)}"
echo "TRADESAFE_PLATFORM_TOKEN_ID = the \"token\" value from apiProfile above (or the id of your company's entry in the token list)"
