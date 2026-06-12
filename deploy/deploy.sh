#!/usr/bin/env bash
#
# Deploy Instastylr as a static site served directly by nginx.
# Run as root on the host:  sudo bash deploy/deploy.sh
# Idempotent — safe to re-run for redeploys (it re-syncs dist/ and reloads).
#
set -euo pipefail

DOMAIN="instastylr.lesfleursdelanuit.com"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$REPO/dist"
WEBROOT="/var/www/instastylr"
NGINX_CONF_SRC="$REPO/deploy/${DOMAIN}.conf"
NGINX_AVAIL="/etc/nginx/sites-available/instastylr"
NGINX_ENABLED="/etc/nginx/sites-enabled/instastylr"

if [[ $EUID -ne 0 ]]; then
  echo "This script must run as root (use sudo)." >&2
  exit 1
fi
if [[ ! -f "$DIST/index.html" ]]; then
  echo "No build found at $DIST — run 'npm run build' first." >&2
  exit 1
fi

echo "==> Publishing $DIST -> $WEBROOT"
mkdir -p "$WEBROOT"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$DIST/" "$WEBROOT/"
else
  rm -rf "${WEBROOT:?}/"* && cp -a "$DIST/." "$WEBROOT/"
fi
chown -R www-data:www-data "$WEBROOT"
find "$WEBROOT" -type d -exec chmod 755 {} +
find "$WEBROOT" -type f -exec chmod 644 {} +

echo "==> Installing nginx site config"
cp "$NGINX_CONF_SRC" "$NGINX_AVAIL"
ln -sfn "$NGINX_AVAIL" "$NGINX_ENABLED"

echo "==> Validating nginx config"
nginx -t

echo "==> Reloading nginx"
systemctl reload nginx

echo "==> Obtaining/renewing TLS certificate (certbot)"
if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect --keep-until-expiring; then
  echo "==> Done.  https://$DOMAIN is live."
else
  echo "certbot did not complete non-interactively." >&2
  echo "If it needs an email/account, run once interactively:" >&2
  echo "    sudo certbot --nginx -d $DOMAIN" >&2
  exit 1
fi
