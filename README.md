# VPN Bruteforce Dashboard

This project provides a small dashboard UI for controlling the Go based VPN bruteforce scanner.

## Environment variables

- `VITE_WS_PORT` - Port number used by the frontend when connecting to the WebSocket API. If not provided the port of the current page (`window.location.port`) is used. Development and build scripts set this to `8080` by default.
