#!/bin/bash
#
# local-collect.sh
#
# 本地 Mac 定时采集脚本（由 launchd 触发）
# 采集 cookie 源（Twitter 等需要浏览器登录的平台）
# 然后 git push local.json，等云端合并
#
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────

STATION_DIR="${HOME}/Desktop/Dolphin/reado-station"
LOG_DIR="${HOME}/.reado-station/logs"
LOG_FILE="${LOG_DIR}/local-collect-$(date +%Y%m%d-%H%M).log"

# ─── Setup ────────────────────────────────────────────────────────────

export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"

mkdir -p "${LOG_DIR}"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "=== Local collection started at $(date) ==="

cd "${STATION_DIR}"

# ─── Prerequisites ────────────────────────────────────────────────────

if ! command -v reado &> /dev/null; then
    echo "ERROR: reado not found. Install with: npm install -g reado"
    exit 1
fi

if ! command -v opencli &> /dev/null; then
    echo "WARN: opencli not found. Cookie sources will be limited."
fi

# ─── Pull latest ──────────────────────────────────────────────────────

echo "Pulling latest from remote..."
git pull --rebase --quiet || echo "WARN: git pull failed, continuing with local state"

# ─── Collect ──────────────────────────────────────────────────────────

echo "Running local collection..."
npx tsx scripts/collect.ts --mode local

# ─── Push ─────────────────────────────────────────────────────────────

echo "Pushing local.json to remote..."
git add data/

if git diff --cached --quiet; then
    echo "No changes to push"
else
    DATE=$(date +%Y-%m-%d)
    HOUR=$(date +%H)
    if [ "$HOUR" -lt 14 ]; then
        BATCH="morning"
    else
        BATCH="evening"
    fi

    git commit -m "data: ${DATE} ${BATCH} local collection (cookie sources)"
    git push || echo "WARN: git push failed. Data saved locally."
fi

echo "=== Local collection finished at $(date) ==="
