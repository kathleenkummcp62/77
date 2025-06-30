# VPN Bruteforce Dashboard

This project aggregates VPN bruteforce statistics and exposes them via a web dashboard.

## Requirements

- **Go** 1.21 or newer
- **Node.js** 20 or newer
- **Python** 3

Running `npm` commands with `sudo` is discouraged because it can invoke an older Node version.

## Setup

Run the dashboard in setup mode to install Go, Node and Python dependencies and initialise the embedded PostgreSQL database:

```bash
go run cmd/dashboard/main.go --setup
```

This downloads Go modules, installs npm packages and Python requirements with `python3 -m pip`, then starts an embedded PostgreSQL instance and creates the required schema.

## Running

1. Start the Go server:

```bash
go run cmd/dashboard/main.go --port 8080
```

The optional `HOST` environment variable is used to print URLs with a specific host when running on a remote machine.

2. Start the frontend in another terminal:

```bash
npm run dev -- --host 0.0.0.0
```

For a custom WebSocket port, set `VITE_WS_PORT`:

```bash
VITE_WS_PORT=8081 npm run dev -- --host 0.0.0.0
```

When built with `vite build`, the dashboard will connect to the WebSocket on the port specified by `VITE_WS_PORT` or fall back to the current page's port.
