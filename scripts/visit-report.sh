#!/usr/bin/env bash
#
# How many people saw each page of the InstaStylr site, and which button took
# them into the app. Reads nginx's access log, so run it with sudo:
#
#   sudo bash scripts/visit-report.sh            # everything in the current logs
#   sudo bash scripts/visit-report.sh 14/Oct/2026 # one day
#
# Page views are the 1-pixel image each page requests (/assets/v.gif?p=<page>);
# button presses are the app opening with ?from=<button>. No cookies, no
# visitor ids: these are counts of requests, so one person reloading counts twice.
#
set -euo pipefail
DAY="${1:-}"
LOGS=(/var/log/nginx/lfdln-hosts.access.log*)
read_logs() {
  for f in "${LOGS[@]}"; do
    case "$f" in *.gz) zcat -- "$f" ;; *) cat -- "$f" ;; esac
  done | { if [[ -n "$DAY" ]]; then grep -F -- "[$DAY" || true; else cat; fi; }
}
tally() { # $1 = extended regex with one capture: what to count
  read_logs | sed -nE "s#.*\"GET $1[^\"]* HTTP[^\"]*\" (200|304) .*#\\1#p" | sort | uniq -c | sort -rn || true
}
echo "Page views${DAY:+ on $DAY}"
tally '/assets/v\.gif\?p=([A-Za-z0-9_-]+)'
echo
echo "App opened from"
tally '/app/\?[^" ]*from=([A-Za-z0-9_-]+)'
