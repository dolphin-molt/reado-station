#!/bin/bash
#
# local-collect.sh
#
# 本地 Mac 定时采集脚本（由 launchd 触发）
# 采集 cookie 源（Twitter 等需要浏览器登录的平台）
# 采集结果通过 D1 API 写入数据库，不再提交到 Git 仓库。
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
export READO_D1_WRITE_REQUIRED="${READO_D1_WRITE_REQUIRED:-true}"
npx tsx scripts/collect.ts --mode local

echo "Local collection finished. Runtime data is D1-only; local files are ignored by Git."

echo "=== Local collection finished at $(date) ==="
