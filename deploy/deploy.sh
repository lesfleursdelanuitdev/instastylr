#!/usr/bin/env bash
#
# Deploy Instastylr: a static site, published into the site folder the lfdln panel
# serves at https://instastylr.lesfleursdelanuit.com (panel.lesfleursdelanuit.com,
# Hosts; ~/pamela-setup/panel/docs/adopt-plan.md). The panel owns nginx for it now --
# its headers (the strict CSP), the cached-for-good /assets/, the single-page fallback
# and the certificate (the lfdln wildcard) -- so this script only copies files.
# Run as root on the host:  sudo bash deploy/deploy.sh
# Idempotent -- safe to re-run for redeploys.
#
# (Before the panel took it over, this script also installed its own nginx file,
# deploy/instastylr.lesfleursdelanuit.com.conf, and ran certbot. That file is kept as
# the record of what the panel's route reproduces; don't install it again: two server
# blocks for one name would fight.)
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$REPO/dist"
# the panel's site folder: svc-lfdlnsites's, group lfdln-sites (nginx reads through it)
WEBROOT="/var/www/lesfleursdelanuit-sub/instastylr"
OWNER="svc-lfdlnsites:lfdln-sites"

if [[ $EUID -ne 0 ]]; then
  echo "This script must run as root (use sudo)." >&2
  exit 1
fi
if [[ ! -f "$DIST/index.html" ]]; then
  echo "No build found at $DIST — run 'npm run build' first." >&2
  exit 1
fi
if [[ -L /etc/nginx/sites-enabled/instastylr ]]; then
  echo "nginx still serves the old /var/www/instastylr (the panel hasn't taken instastylr over yet):" >&2
  echo "    sudo ~/pamela-setup/panel/deploy/lfdln/install-lfdln.sh --take-over-host instastylr" >&2
  exit 1
fi
if [[ ! -d $WEBROOT ]]; then
  echo "$WEBROOT isn't there: the panel's site folder for instastylr is missing." >&2
  exit 1
fi

echo "==> Publishing $DIST -> $WEBROOT"
rsync -a --delete --no-owner --no-group "$DIST/" "$WEBROOT/"
chown -R "$OWNER" "$WEBROOT"
find "$WEBROOT" -type d -exec chmod 2750 {} +
find "$WEBROOT" -type f -exec chmod 640 {} +

code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 https://instastylr.lesfleursdelanuit.com/ || true)
echo "==> Done.  https://instastylr.lesfleursdelanuit.com/ answers $code."
