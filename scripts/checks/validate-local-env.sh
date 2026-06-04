#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

check_file_exists() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "Missing required env file: $file"
    return 1
  fi
  return 0
}

check_keys() {
  local file="$1"
  shift
  local missing=0

  for key in "$@"; do
    if ! rg -q "^${key}=" "$file"; then
      echo "Missing key '${key}' in ${file#$ROOT_DIR/}"
      missing=1
    fi
  done

  return $missing
}

api_env="$ROOT_DIR/apps/api/.env"
web_env="$ROOT_DIR/apps/web/.env.local"
db_env="$ROOT_DIR/packages/database/.env"

api_required=(
  DATABASE_URL
  JWT_SECRET
  SESSION_SECRET
  REDIS_URL
  REDIS_PASSWORD
  API_PORT
  WEB_PORT
  COOKIE_DOMAIN
  CORS_ORIGIN
  AZURE_TENANT_ID
  AZURE_CLIENT_ID
  AZURE_CLIENT_SECRET
  AZURE_API_CLIENT_ID
)

web_required=(
  NEXT_PUBLIC_API_URL
  NEXT_PUBLIC_AZURE_CLIENT_ID
  NEXT_PUBLIC_AZURE_TENANT_ID
  NEXT_PUBLIC_AZURE_REDIRECT_URI
  NEXT_PUBLIC_AZURE_POST_LOGOUT_REDIRECT_URI
  NEXT_PUBLIC_AZURE_API_SCOPE
)

db_required=(
  DATABASE_URL
)

status=0

check_file_exists "$api_env" || status=1
check_file_exists "$web_env" || status=1
check_file_exists "$db_env" || status=1

if [[ "$status" -ne 0 ]]; then
  exit 1
fi

check_keys "$api_env" "${api_required[@]}" || status=1
check_keys "$web_env" "${web_required[@]}" || status=1
check_keys "$db_env" "${db_required[@]}" || status=1

if [[ "$status" -ne 0 ]]; then
  echo "Local env validation failed."
  exit 1
fi

echo "Local env validation passed."
