#!/usr/bin/env bash
# Install project dependencies for development.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Installing Go dependencies..."
go mod download

echo "Installing Node dependencies..."
npm install

if command -v pip >/dev/null 2>&1; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Initialize embedded PostgreSQL to download binaries and create schema
GO_RUN="go run cmd/dashboard/main.go --setup-db"
$GO_RUN

echo "Setup completed"
