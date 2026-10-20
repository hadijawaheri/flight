#!/usr/bin/env bash
# One-time firewall setup on the Ubuntu server, run with sudo. Opens only SSH, HTTP and HTTPS;
# MongoDB (27017), the API (7791), the web app (7792) and anything else stay closed from outside.
# Keep a second SSH session open while running it, so a mistake cannot lock you out.
set -euo pipefail

SSH_PORT="${SSH_PORT:-22}"

apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw limit "$SSH_PORT"/tcp comment 'SSH (rate limited)'
ufw allow 80/tcp comment 'HTTP (Caddy redirects to HTTPS)'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose

echo
echo "Listening sockets that are NOT on loopback (each should be 22, 80 or 443):"
ss -tlnH | awk '{print $4}' | grep -vE '^(127\.|\[::1\])' || true
