#!/usr/bin/env bash
# N1MM Logger+ Chinese Guide - launcher for macOS / Linux
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js was not found. Please install Node.js 18+ from https://nodejs.org/"
  exit 1
fi
exec node server.mjs "$@"
