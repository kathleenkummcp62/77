#!/usr/bin/env bash

# Development helper script
# - builds the frontend if not already built
# - starts the Go API server
# - optionally runs the Vite dev server or serves the built assets
# - the API server automatically starts an embedded database via db.Connect when no external DB is reachable

set -euo pipefail

# determine project root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

function usage() {
    echo "Usage: $0 [--serve|--setup]"
    echo "  --serve     Serve the built frontend instead of running Vite dev server"
    echo "  --setup     Install dependencies and initialize the database"
}

MODE=dev
SETUP=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        --serve)
            MODE=serve
            shift
            ;;
        --setup)
            SETUP=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            usage
            exit 1
            ;;
    esac
done

if [[ $SETUP == true ]]; then
    "${ROOT_DIR}/scripts/setup.sh"
fi

if [[ ! -d dist ]]; then
    echo "Building frontend..."
    npm run build
fi

# Start the Go API server (will start embedded DB if needed)
GO_CMD="go run cmd/dashboard/main.go"
$GO_CMD &
API_PID=$!

echo "API server started with PID $API_PID"

if [[ $MODE == "dev" ]]; then
    echo "Starting Vite dev server..."
    npm run dev &
    VITE_PID=$!
    trap 'kill $API_PID $VITE_PID' INT TERM
    wait $API_PID $VITE_PID
else
    trap 'kill $API_PID' INT TERM
    wait $API_PID
fi
