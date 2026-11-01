#!/usr/bin/env bash
# Runs on the server (piped over ssh by deploy-web.sh): start the new website
# container, check it answers, and roll back to the previous one if it doesn't.
set -euo pipefail
TAG="$1"
NAME=avela-web
PORT=3100

had_old=""
if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
  had_old=1
  docker rm -f "$NAME-prev" >/dev/null 2>&1 || true
  docker rename "$NAME" "$NAME-prev"
  docker stop "$NAME-prev" >/dev/null
fi

docker run -d --name "$NAME" --restart unless-stopped --memory 256m \
  -p "127.0.0.1:$PORT:3000" "avela-web:$TAG" >/dev/null

ok=""
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/login"; then ok=1; break; fi
  sleep 1
done

if [ -n "$ok" ]; then
  docker rm "$NAME-prev" >/dev/null 2>&1 || true
  # Keep the three newest website images for quick rollbacks.
  docker images avela-web --format '{{.Tag}}' | tail -n +4 | xargs -r -I{} docker rmi "avela-web:{}" >/dev/null 2>&1 || true
  echo "OK: avela-web:$TAG is serving on 127.0.0.1:$PORT"
else
  echo "FAILED: avela-web:$TAG did not answer; rolling back" >&2
  docker logs --tail 30 "$NAME" >&2 || true
  docker rm -f "$NAME" >/dev/null
  if [ -n "$had_old" ]; then docker rename "$NAME-prev" "$NAME" && docker start "$NAME" >/dev/null; fi
  exit 1
fi
