#!/bin/bash
#
# Builds the client for an environment and uploads it over SSH.
#
#   npm run deploy            pick the environment from a menu
#   npm run deploy -- sta     or pass it (dev, sta, pro)
#   DRY_RUN=1 npm run deploy  print what would run, change nothing
#
# Settings come from .env (git-ignored). SSH_DIR and API_URL are templates: {env} becomes dev, sta or
# pro, and {.env} becomes .dev, .sta or nothing in production. Any of them can be overridden for one
# environment with a prefix (STA_SSH_DIR, PRO_API_URL, DEV_SSH_HOST, ...).
#
#   SSH_HOST=...   SSH_USER=...   SSH_BUILD=dist
#   SSH_DIR=/var/www/expenses.armn.do/{env}/client
#   API_URL=https://expenses-api{.env}.armn.do
#
# VITE_API_URL stays for `npm run dev`; the build gets API_URL of the environment instead.

set -eu

cd "$(dirname "$0")/.."

ENVIRONMENTS="dev sta pro"
timestamp=$(date +%Y-%m-%d-%H%M%S)

# Value of KEY in .env (last one wins, quotes and CR removed), empty when missing.
read_var() {
  [ -f .env ] || return 0
  { grep -E "^$1=" .env || true; } | tail -1 | cut -d= -f2- | sed -e 's/\r$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

# Value of KEY for the chosen environment. ${PREFIX}_KEY is used as it is; otherwise KEY is a template
# where {env} becomes dev, sta or pro and {.env} becomes .dev, .sta or nothing in production. A KEY with
# neither mark is refused, so an environment can never silently get another one's value.
resolve() {
  local value dot
  value=$(read_var "${PREFIX}_$1")
  if [ -n "$value" ]; then
    echo "$value"
    return 0
  fi
  value=$(read_var "$1")
  [ -n "$value" ] || return 0
  case "$value" in
    *"{env}"*|*"{.env}"*) ;;
    *) echo "$1 in .env has no {env} or {.env}: make it a template or set ${PREFIX}_$1" >&2; exit 1 ;;
  esac
  dot=".$ENV_NAME"
  [ "$ENV_NAME" = "pro" ] && dot=""
  echo "$value" | sed -e "s/{\.env}/$dot/g" -e "s/{env}/$ENV_NAME/g"
}

# Runs the command, or only prints it in a dry run.
run() {
  if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

ENV_NAME=$(echo "${1:-}" | tr '[:upper:]' '[:lower:]')

if [ -z "$ENV_NAME" ]; then
  echo "Environment:"
  i=1
  for e in $ENVIRONMENTS; do
    echo "  $i) $e"
    i=$((i + 1))
  done
  echo ""
  read -r -p "Select the environment (name or number): " ENV_NAME
  ENV_NAME=$(echo "$ENV_NAME" | tr '[:upper:]' '[:lower:]')
  i=1
  for e in $ENVIRONMENTS; do
    [ "$ENV_NAME" = "$i" ] && ENV_NAME=$e
    i=$((i + 1))
  done
fi

case " $ENVIRONMENTS " in
  *" $ENV_NAME "*) ;;
  *) echo "Unknown environment '$ENV_NAME', use one of: $ENVIRONMENTS"; exit 1 ;;
esac

PREFIX=$(echo "$ENV_NAME" | tr '[:lower:]' '[:upper:]')

SSH_HOST=$(read_var "${PREFIX}_SSH_HOST")
[ -n "$SSH_HOST" ] || SSH_HOST=$(read_var SSH_HOST)
SSH_USER=$(read_var "${PREFIX}_SSH_USER")
[ -n "$SSH_USER" ] || SSH_USER=$(read_var SSH_USER)
SSH_BUILD=$(read_var "${PREFIX}_SSH_BUILD")
[ -n "$SSH_BUILD" ] || SSH_BUILD=$(read_var SSH_BUILD)
[ -n "$SSH_BUILD" ] || SSH_BUILD=dist
SSH_DIR=$(resolve SSH_DIR)
API_URL=$(resolve API_URL)

missing=""
[ -n "$SSH_HOST" ] || missing="$missing SSH_HOST"
[ -n "$SSH_USER" ] || missing="$missing SSH_USER"
[ -n "$SSH_DIR" ] || missing="$missing SSH_DIR"
[ -n "$API_URL" ] || missing="$missing API_URL"

if [ -n "$missing" ]; then
  echo "Not set in .env:$missing"
  exit 1
fi

# The remote directory is wiped, so never accept anything that could be a home or the root.
case "$SSH_DIR" in
  "/"|"~"|"~/"|*" "*) echo "Refusing to deploy to SSH_DIR='$SSH_DIR'"; exit 1 ;;
esac

echo ""
echo "Environment: $ENV_NAME"
echo "   SSH_HOST = '$SSH_HOST'"
echo "   SSH_USER = '$SSH_USER'"
echo "  SSH_BUILD = '$SSH_BUILD'"
echo "    SSH_DIR = '$SSH_DIR'"
echo "    API URL = '$API_URL'"
echo ""

if [ "$ENV_NAME" = "pro" ]; then
  read -r -p "This is PRODUCTION. Type 'pro' to deploy: " response
  [ "$response" = "pro" ] || { echo "Aborting."; exit 1; }
else
  read -r -p "Do you want to deploy with these settings? (y)/n: " response
  response=$(echo "${response:-y}" | tr '[:upper:]' '[:lower:]')
  case "$response" in
    y|yes) ;;
    n|no) echo "Aborting."; exit 1 ;;
    *) echo "Invalid input, please answer yes(y) or no(n)."; exit 1 ;;
  esac
fi

echo ""
echo "Deploying..."
zip_file="$SSH_BUILD-$timestamp.zip"
run env VITE_API_URL="$API_URL" npm run build
run rm -f ./"$SSH_BUILD"*.zip
run zip -r -q "$zip_file" "$SSH_BUILD"
run ssh "$SSH_USER@$SSH_HOST" "cd $SSH_DIR && rm -rf ./* && echo \"Removed old build.\""
run scp "$zip_file" "$SSH_USER@$SSH_HOST:$SSH_DIR"
run ssh "$SSH_USER@$SSH_HOST" "cd $SSH_DIR && unzip -q ./$zip_file -d ./ && mv ./$SSH_BUILD/* ./"
echo ""
echo "Done deploying to $ENV_NAME."
