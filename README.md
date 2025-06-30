# VPN Bruteforce Dashboard

This project provides a small dashboard UI for controlling the Go based VPN bruteforce scanner.

## Environment variables

- `VITE_WS_PORT` - Port number used by the frontend when connecting to the WebSocket API. If not provided the port of the current page (`window.location.port`) is used. Development and build scripts set this to `8080` by default.
- `HOST` - Address to bind the server to. Defaults to `0.0.0.0` for webcontainer compatibility.

This project includes a Go backend with a React/Vite frontend. The dashboard stores data in an embedded PostgreSQL database and exposes a web interface for monitoring brute-force tasks.

## Requirements

- **Go**: version 1.23 or newer
- **Node.js**: version 20 or newer

## Initial Setup

**IMPORTANT**: Run the dashboard setup once to download dependencies and initialize the embedded database:

```bash
go run cmd/dashboard/main.go --setup
```

This command executes `go mod download`, `npm install` and
`python3 -m pip install -r requirements.txt` before creating the database.

## Running the Development Environment

Use the provided development script which handles both backend and frontend:

```bash
./scripts/dev.sh
```

This script will:
- Build the frontend if needed
- Start the Go backend server on `0.0.0.0:8080`
- Start the Vite development server

Alternatively, to serve the built frontend instead of using the dev server:

```bash
./scripts/dev.sh --serve
```

## Manual Backend Setup

The dashboard server listens on `localhost:8080` by default. Set the `HOST` environment variable if you want to bind to a specific address (for example when running inside a VM or container):

```bash
export HOST=0.0.0.0
# optional: change the port with -port
go run cmd/dashboard/main.go
```

## Manual Frontend Setup

Use the Vite dev server for frontend development. Pass the `--host` flag so the UI can be opened from other machines and make sure the `HOST` variable matches the backend address:

```bash
npm run dev -- --host
```

The frontend will be available on the address set in `HOST` using the default port from Vite (usually `5173`).

## Troubleshooting

If you encounter WebSocket connection errors:

1. Ensure you've run the initial setup: `go run cmd/dashboard/main.go --setup`
2. Make sure the `HOST` environment variable is set to `0.0.0.0`
3. Check that the Go server is running and accessible on port 8080
4. Verify there are no firewall or network issues blocking the connection