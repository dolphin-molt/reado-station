#!/bin/bash
# Thin wrapper — delegates to the cross-platform Node.js installer.
# Usage: bash skills/install.sh [--project]
exec node "$(dirname "$0")/install.cjs" "$@"
