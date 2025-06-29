BINARY_NAME=vpn-bruteforce
BINARY_UNIX=$(BINARY_NAME)_unix
BINARY_WINDOWS=$(BINARY_NAME).exe

.PHONY: build clean run test deps

# Build for current platform
build:
	go build -ldflags="-s -w" -o $(BINARY_NAME) main.go

# Build for Linux
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o $(BINARY_UNIX) main.go

# Build for Windows
build-windows:
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o $(BINARY_WINDOWS) main.go

# Build for all platforms
build-all: build-linux build-windows

# Install dependencies
deps:
	go mod tidy
	go mod download

# Run with default config
run:
	go run main.go -type=fortinet -threads=1000 -input=credentials.txt

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	go clean
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)
	rm -f $(BINARY_WINDOWS)
	rm -f stats_*.json

# Performance test
perf-test:
	go run main.go -type=fortinet -threads=2000 -timeout=3 -verbose=true

# Install
install: build
	sudo cp $(BINARY_NAME) /usr/local/bin/

.DEFAULT_GOAL := build