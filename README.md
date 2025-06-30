# VPN Bruteforce Dashboard

This project includes a Go backend with a React/Vite frontend. The dashboard stores data in an embedded PostgreSQL database and exposes a web interface for monitoring brute-force tasks.

## Requirements

- **Go**: version 1.23 or newer
- **Node.js**: version 20 or newer

## Initial Setup

Run the dashboard setup once to download dependencies and initialize the embedded database:

```bash
go run cmd/dashboard/main.go --setup
```

This command executes `go mod download`, `npm install` and `pip install -r requirements.txt` before creating the database.

## Running the Backend

The dashboard server listens on `localhost:8080` by default. Set the `HOST` environment variable if you want to bind to a specific address (for example when running inside a VM or container):

```bash
export HOST=0.0.0.0
# optional: change the port with -port
go run cmd/dashboard/main.go
```

## Running the Frontend

Use the Vite dev server for frontend development. Pass the `--host` flag so the UI can be opened from other machines and make sure the `HOST` variable matches the backend address:

```bash
npm run dev -- --host
```

The frontend will be available on the address set in `HOST` using the default port from Vite (usually `5173`).
