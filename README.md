# VPN Bruteforce Dashboard

This project consists of a Go backend with a React frontend used to monitor VPN bruteforce tasks. A helper `--setup` flag installs dependencies and prepares a local database for development.

## Prerequisites

- **Go** 1.23+
- **Node.js** 20 or newer
- **Python** 3

Running `npm` commands with `sudo` is discouraged because it may invoke a different Node version.

## Setup

Use the built in setup helper to download Go modules, install Node and Python dependencies and initialise the embedded Postgres database:

```bash
go run cmd/dashboard/main.go --setup
```

The command executes `go mod download`, `npm install` and `python3 -m pip install -r requirements.txt`. After the dependencies are installed it starts an embedded Postgres instance and writes an entry to the database to confirm the setup.

If you want to use an external Postgres instance configure the connection in `config.yaml` before running the command.

## Running

Start the backend:

```bash
go run cmd/dashboard/main.go --port 8080
```

Use the optional `HOST` environment variable to print URLs for a specific host/IP address:

```bash
HOST=192.168.1.10 go run cmd/dashboard/main.go
```

Start the frontend (from another terminal):

```bash
npm run dev -- --host
```

The dashboard will be available on the printed host/port. WebSocket connections use the `VITE_WS_PORT` environment variable if set, otherwise they fall back to `window.location.port`.

## Custom WebSocket Port

If the backend runs on a different port specify it when launching the frontend:

```bash
VITE_WS_PORT=9090 npm run dev -- --host
```

## Tests

Run all Go tests with:

```bash
go test ./...
```

Run the TypeScript linter with:

```bash
npm run lint
```
