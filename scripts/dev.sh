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

export VITE_WS_PORT=${VITE_WS_PORT:-8080}
# Set HOST to bind to all interfaces for webcontainer compatibility
export HOST=${HOST:-0.0.0.0}

function usage() {
    echo "Usage: $0 [--serve]"
    echo "  --serve    Serve the built frontend instead of running Vite dev server"
}

MODE=dev
while [[ $# -gt 0 ]]; do
    case "$1" in
        --serve)
            MODE=serve
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

# Check if setup has been run
if [[ ! -f go.mod ]] || [[ ! -d node_modules ]]; then
    echo "⚠️  Initial setup may not have been completed."
    echo "Please run: go run cmd/dashboard/main.go --setup"
    echo "This will download dependencies and initialize the database."
    echo ""
fi

if [[ ! -d dist ]]; then
    echo "Building frontend..."
    npm run build
fi

echo "Starting Go API server on $HOST:8080..."
# Start the Go API server (will start embedded DB if needed)
GO_CMD="go run cmd/dashboard/main.go"
$GO_CMD &
API_PID=$!

echo "API server started with PID $API_PID"

# Give the server a moment to start
sleep 2

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