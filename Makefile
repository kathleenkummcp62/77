BINARY_NAME=vpn-ultra-fast
BINARY_UNIX=$(BINARY_NAME)_linux
BINARY_WINDOWS=$(BINARY_NAME).exe

# Build flags for maximum performance
BUILD_FLAGS=-ldflags="-s -w -X main.version=3.0" -trimpath
RACE_FLAGS=-race
BENCH_FLAGS=-benchmem -benchtime=10s
GOFILES=$(shell git ls-files '*.go')

.PHONY: build clean run test deps benchmark profile fmt vet

# Build for maximum performance
build:
	CGO_ENABLED=0 go build $(BUILD_FLAGS) -o $(BINARY_NAME) main.go

# Build with race detection for testing
build-race:
	go build $(BUILD_FLAGS) $(RACE_FLAGS) -o $(BINARY_NAME)_race main.go

# Build for Linux (optimized for servers)
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build $(BUILD_FLAGS) -o $(BINARY_UNIX) main.go

# Build for Windows
build-windows:
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build $(BUILD_FLAGS) -o $(BINARY_WINDOWS) main.go

# Build for all platforms
build-all: build-linux build-windows

# Install dependencies and optimize
deps:
	go mod tidy
	go mod download
	go mod verify

# Format Go code and fail if changes are needed
fmt:
	@gofmt -w $(GOFILES)
	@git diff --quiet $(GOFILES)

# Run go vet analysis
vet:
	go vet ./...

# Run with ultra-fast settings
run:
	go run main.go -type=fortinet -threads=3000 -rate=8000 -input=credentials.txt -verbose

# Run performance benchmark
benchmark:
	go run main.go -benchmark
	go test -bench=. -benchmem ./...

# Run with profiling
profile:
	go run main.go -type=fortinet -threads=1000 -cpuprofile=cpu.prof -memprofile=mem.prof

# Performance tests
test-perf:
	go test -v -bench=. $(BENCH_FLAGS) ./internal/...

# Memory leak detection
test-memory:
	go test -v -run=TestMemoryLeak -memprofile=mem.prof ./internal/...

# Race condition testing
test-race:
	go test -v -race ./internal/...

# Full test suite
test: fmt vet test-race test-perf test-memory

# Clean build artifacts
clean:
	go clean
	rm -f $(BINARY_NAME)*
	rm -f *.prof
	rm -f stats_*.json
	rm -f valid_*.txt

# Install optimized binary
install: build-linux
	sudo cp $(BINARY_UNIX) /usr/local/bin/$(BINARY_NAME)
	sudo chmod +x /usr/local/bin/$(BINARY_NAME)

# Docker build for containerized deployment
docker-build:
	docker build -t vpn-ultra-fast:latest .

# Performance monitoring
monitor:
	watch -n 1 'ps aux | grep $(BINARY_NAME) | head -5'

.DEFAULT_GOAL := build
