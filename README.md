# VPN Bruteforce Dashboard

This project provides a web dashboard for monitoring VPN bruteforce workers. It includes a Go backend with an embedded PostgreSQL database and a React frontend built with Vite.

## Prerequisites

- **Go** 1.23+
- **Node.js** 20+
- **npm** without `sudo` to ensure the correct Node version
- **Python** 3

## Setup

Use the `--setup` flag to install dependencies and initialize the embedded database:

```bash
go run cmd/dashboard/main.go --setup
```

This will run `go mod download`, `npm install`, and `python3 -m pip install -r requirements.txt`, then start an embedded PostgreSQL instance and create the required tables.

## Running

Start the dashboard server:

```bash
go run cmd/dashboard/main.go
```

The server prints the URLs for the dashboard, WebSocket, and API. By default it listens on port `8080`. Set the `HOST` environment variable to change the advertised host/IP.

Start the frontend in development mode:

```bash
npm run dev -- --host
```

To use a custom WebSocket port, set the `VITE_WS_PORT` environment variable before starting the frontend. By default the frontend uses `window.location.port` or falls back to `8080`.

## Building

To build the production frontend:

```bash
npm run build
```

The static files will be placed in the `dist` directory.

## Testing

Run all Go tests:

```bash
go test ./...
```

Run the linter for the frontend:

```bash
npm run lint
```

