#!/usr/bin/env bash
while true; do
  echo "[$(date)] Starting localtunnel for subdomain kontrakanku-app on port 3000..."
  npx -y localtunnel --port 3000 --subdomain kontrakanku-app
  echo "[$(date)] Localtunnel disconnected, auto-reconnecting in 3 seconds..."
  sleep 3
done
