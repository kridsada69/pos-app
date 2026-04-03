#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/.next/standalone"
STATIC_DIR="$ROOT_DIR/.next/static"
PUBLIC_DIR="$ROOT_DIR/public"
PRISMA_DIR="$ROOT_DIR/prisma"
SERVER_FILE="$ROOT_DIR/server.js"
ZIP_PATH="$ROOT_DIR/pos-app-deploy.zip"

if [[ ! -f "$BUILD_DIR/server.js" ]]; then
  echo "Missing standalone build at .next/standalone/server.js"
  echo "Run: npm run build"
  exit 1
fi

STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pos-app-deploy.XXXXXX")"
APP_DIR="$STAGE_DIR/pos-app"

mkdir -p "$APP_DIR/.next"

cp -R "$BUILD_DIR" "$APP_DIR/.next/standalone"
cp -R "$STATIC_DIR" "$APP_DIR/.next/static"
cp -R "$PUBLIC_DIR" "$APP_DIR/public"
cp -R "$PRISMA_DIR" "$APP_DIR/prisma"
cp "$SERVER_FILE" "$APP_DIR/server.js"

if [[ -f "$ROOT_DIR/package.json" ]]; then
  cp "$ROOT_DIR/package.json" "$APP_DIR/package.json"
fi

if [[ -f "$ROOT_DIR/package-lock.json" ]]; then
  cp "$ROOT_DIR/package-lock.json" "$APP_DIR/package-lock.json"
fi

if [[ -f "$ROOT_DIR/.env" ]]; then
  cp "$ROOT_DIR/.env" "$APP_DIR/.env"
fi

cd "$STAGE_DIR"
zip -rq "$ZIP_PATH" pos-app

echo "Created $ZIP_PATH"
