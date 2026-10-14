#!/usr/bin/env bash
#
# Turn on gzip for scripts, styles and other text files in nginx.
# nginx on this host only compresses HTML by default ("gzip on" with no
# gzip_types), so the site's JavaScript and CSS go out at full size.
#
# This is a server-wide setting: it applies to every site nginx serves here,
# not just InstaStylr. It only adds compression; nothing else changes.
#
#   sudo bash deploy/enable-compression.sh
#
# To undo: sudo rm /etc/nginx/conf.d/compression.conf && sudo systemctl reload nginx
#
set -euo pipefail
CONF=/etc/nginx/conf.d/compression.conf
if [[ $EUID -ne 0 ]]; then
  echo "This script must run as root (use sudo)." >&2
  exit 1
fi
if grep -rEs '^\s*gzip_types\b' /etc/nginx/nginx.conf /etc/nginx/conf.d /etc/nginx/sites-enabled | grep -v "^$CONF:" ; then
  echo "gzip_types is already set in the file(s) above; not adding a second one." >&2
  exit 1
fi
cat > "$CONF" <<'CONFEOF'
# Written by instastylr's deploy/enable-compression.sh.
# "gzip on" is in nginx.conf; this says what besides HTML to compress.
gzip_types text/css application/javascript text/javascript application/json application/xml text/xml image/svg+xml text/plain application/manifest+json;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_vary on;
gzip_proxied any;
CONFEOF
echo "==> Wrote $CONF"
if ! nginx -t; then
  rm -f "$CONF"
  echo "nginx rejected the config; removed $CONF again. Nothing changed." >&2
  exit 1
fi
systemctl reload nginx
sleep 1
enc=$(curl -sSI -H 'Accept-Encoding: gzip' --max-time 10 "https://instastylr.lesfleursdelanuit.com/robots.txt" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-encoding"{print $2}')
css=$(curl -sS --max-time 10 https://instastylr.lesfleursdelanuit.com/ | grep -o '/assets/[^"]*\.css' | head -1)
cenc=$(curl -sSI -H 'Accept-Encoding: gzip' --max-time 10 "https://instastylr.lesfleursdelanuit.com$css" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-encoding"{print $2}')
echo "==> Done. Stylesheet $css is now served with Content-Encoding: ${cenc:-none}."
