#!/usr/bin/env bash
# Build the Avela website on this Mac and run it on the server next to the API.
# The Next.js build runs here so the shared 1 GB server never runs npm or Next.js builds.
#   ./deploy/deploy-web.sh
set -euo pipefail
HOST="${AVELA_HOST:-root@67.205.156.209}"
API_URL="${NEXT_PUBLIC_API_URL:-https://api.avelaevent.com/api}"

cd "$(dirname "$0")/.."
TAG="$(git rev-parse --short HEAD)"
[ -z "$(git status --porcelain -- src public next.config.ts package.json package-lock.json)" ] || TAG="$TAG-dirty"

echo "Building $TAG against $API_URL"
rm -rf .next
NEXT_OUTPUT=standalone NEXT_PUBLIC_API_URL="$API_URL" npx next build

CTX="$(mktemp -d)"
trap 'rm -rf "$CTX"' EXIT
cp -R .next/standalone "$CTX/app"
cp -R public "$CTX/app/public"
mkdir -p "$CTX/app/.next" && cp -R .next/static "$CTX/app/.next/static"
# sharp's macOS binary gets traced in; the site doesn't use next/image.
rm -rf "$CTX/app/node_modules/@img"
cp deploy/web.Dockerfile "$CTX/Dockerfile"

# The server only packages the finished files into an image (COPY steps, no npm).
echo "Shipping $TAG to $HOST"
tar -C "$CTX" -czf - . | ssh "$HOST" "set -e; d=\$(mktemp -d); tar -C \$d -xzf -; docker build -q -t avela-web:$TAG \$d >/dev/null; rm -rf \$d"
ssh "$HOST" "bash -s -- $TAG" < deploy/swap-web.sh
