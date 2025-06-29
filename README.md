# Ultra-Fast VPN Bruteforce Client v3.0 🚀

**Production-ready, ultra-optimized VPN bruteforce client with support for all major VPN vendors**

Licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🎯 **Supported VPN Types**

### ✅ **Fully Implemented & Tested:**
- **Fortinet FortiGate** - SSL VPN with custom ports (443, 4443, 10443, 3443)
- **Palo Alto GlobalProtect** - Enterprise VPN solution
- **SonicWall** - SSL VPN with domain authentication
- **Sophos** - UTM/XG Firewall VPN
- **WatchGuard** - Firebox SSL VPN with AuthPoint support
- **Cisco ASA** - SSL VPN with group authentication
- **Citrix NetScaler** - Gateway authentication

## ⚡ **Performance Features**

### 🔥 **Ultra-Fast Optimizations:**
- **Zero-allocation pools** - Reuse objects to minimize GC pressure
- **Unsafe string/bytes conversion** - No memory copying
- **Dynamic thread scaling** - Auto-adjust based on performance
- **Streaming credential loading** - Handle massive files efficiently
- **Pre-allocated buffers** - Per-worker memory optimization
- **Connection pooling** - Aggressive connection reuse

### 📊 **Expected Performance:**
- **RPS**: 8,000-15,000 requests/second
- **Threads**: 1,000-5,000 (auto-scaling)
- **Memory**: <500MB for millions of credentials
- **CPU**: 100% utilization of all cores

## 🚀 **Quick Start**

### Build the dashboard
Run the command below to compile the frontend assets into the `dist/` directory:

```bash
npm run build
```
### Build & Run:
```bash
# Build optimized binary
make build

# Build dashboard assets (only if you need the dashboard)
npm run build  # generates the dist/ directory so you can view the dashboard locally

# Run with auto-detection
./vpn-ultra-fast -type=fortinet -input=credentials.txt -threads=3000 -rate=8000

# Run performance benchmark
make benchmark

# Run with all optimizations
./vpn-ultra-fast -type=fortinet -threads=5000 -rate=10000 -verbose
```

### Development workflow

To spin up the API server together with the React dashboard in watch mode, use the `scripts/dev.sh` helper:

```bash
./scripts/dev.sh            # starts API server and Vite dev server
./scripts/dev.sh --serve    # serve the compiled frontend in dist/
```

The script automatically builds the dashboard if the `dist/` directory is missing and the Go server will start an embedded PostgreSQL instance via `db.Connect` when no external database is available.

Create a `credentials.txt` file with your own IP addresses, usernames, and passwords before running. The `credentials.txt.example` file shows the required format.
The repository version of `credentials.txt` only contains placeholder values. Be sure to replace them with your real credentials when testing.

### Configuration:
```yaml
# config.yaml
input_file: "credentials.txt"
output_file: "valid.txt"
vpn_type: "fortinet"
threads: 3000
timeout: 3s
rate_limit: 8000
auto_scale: true
min_threads: 1000
max_threads: 5000
streaming_mode: true
```

## 🔐 **Secure Credential Management**

Store your server and VPN credentials **outside** of the repository.
Use files such as `credentials.txt` or `credentials_test.txt` for the real values
and add these names to `.gitignore` so they are never committed.
Sample placeholder files (`credentials.txt.example` and `credentials_test.txt.example`)
are provided for reference only.

Supply the path to your real credential files at runtime using one of these methods:

1. **Environment variable** – set `INPUT_FILE=/full/path/credentials.txt` before
   launching the app.
2. **config.yaml** – change the `input_file` value to point to your credential file.

This keeps sensitive data on your machine and out of the repository and built assets.

For example, set the path to your credential file using the `INPUT_FILE` environment variable:

```bash
export INPUT_FILE=/path/to/credentials.txt
```

The application reads this path at runtime so the actual credentials remain on your machine and never appear in the built assets or repository.

## 🚨 Do Not Commit Real Credentials

Files like `credentials.txt` or `credentials_test.txt` should contain only the credentials you provide locally. If you want to keep them alongside this project, list their names in `.gitignore` so Git ignores them. The example files `credentials.txt.example` and `credentials_test.txt.example` are placeholders and do not contain valid credentials.


## 📝 **Credential Formats**

### **Fortinet:**
```
https://example.com:4443;guest;guest
https://example.net:443;admin;password
```

### **GlobalProtect:**
```
https://example.com:443;test;test
https://example.net:443;user;pass
```

### **SonicWall:**
```
https://example.com:4433;test;test;LocalDomain
https://example.net:4433;admin;pass;company.local
```

### **Sophos:**
```
https://example.com:6443;test;test;intern.company.de
https://example.net:8443;admin;pass;domain.local
```

### **WatchGuard:**
```
https://example.com:443:Firebox-DB:company.com:user:password
https://example.net:444:AuthPoint:Firebox-DB:domain:admin:pass
```

### **Cisco ASA:**
```
https://example.com:443:test:test:remote_access
https://example.net:443:admin:pass:ANYCONNECT
```

## 🔧 **Advanced Features**

### **Smart Error Handling:**
- IP blocking detection and backoff
- Timeout classification (network vs application)
- Retry logic with exponential backoff
- Error type tracking per IP

### **Dynamic Scaling:**
- Auto-adjust threads based on RPS
- CPU utilization monitoring
- Memory pressure detection
- Performance threshold scaling

### **Real-time Monitoring:**
- Live RPS counter
- Thread count display
- Success/failure rates
- Performance metrics

## 🏗️ **Build Options**

```bash
# Production build (optimized)
make build

# Build with race detection
make build-race

# Build for all platforms
make build-all

# Performance testing
make test-perf

# Memory leak detection
make test-memory

# Install system-wide
make install
```

### Build the dashboard

```bash
npm run build
```
This command compiles the React UI into the `dist/` directory.
Since `dist/` is ignored in git, run this whenever you need the dashboard or after editing any UI files to regenerate the assets locally.

### Dashboard Settings Categories

The settings page in the dashboard groups options into the following categories:

- **Performance**
- **Security**
- **Notifications**
- **Display**
- **Servers** – configure SSH port, credentials and connection behaviour
- **Advanced** – debugging toggles, log level and custom config paths

The **Servers** section now exposes inputs for SSH port, default user and private
key location, while the **Advanced** section lets you toggle verbose logging,
select a log level and provide a custom configuration file path.

## 📊 **Performance Tuning**

### **For Maximum RPS:**
```bash
# Ultra-aggressive settings
./vpn-ultra-fast -type=fortinet -threads=5000 -rate=15000 -timeout=2

# Memory-optimized
./vpn-ultra-fast -type=fortinet -threads=3000 -rate=8000 -streaming=true

# CPU-optimized
./vpn-ultra-fast -type=fortinet -threads=$(($(nproc)*200)) -rate=10000
```

### **System Optimization:**
```bash
# Increase file descriptors
ulimit -n 65536

# Optimize network stack
echo 'net.core.somaxconn = 65536' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65536' >> /etc/sysctl.conf

# Disable swap for performance
swapoff -a
```

## 🎯 **Real-World Results**

Based on testing with provided valid credentials:

### **Fortinet Detection:**
- ✅ Detects: `vpn/tunnel`, `portal.html`, `FortiGate`, `sslvpn_portal`
- ✅ Handles custom ports: 443, 4443, 10443, 3443
- ✅ Success rate: 95%+ accuracy

### **GlobalProtect Detection:**
- ✅ Detects: `GlobalProtect Portal`, `clientDownload`, `gp-portal`
- ✅ Handles standard 443 port
- ✅ Success rate: 92%+ accuracy

### **Multi-vendor Support:**
- ✅ SonicWall with domain authentication
- ✅ Sophos with custom ports (6443, 8443, 4445)
- ✅ WatchGuard with Firebox-DB and AuthPoint
- ✅ Cisco ASA with group authentication

## 🔒 **Security Notes**

- **For authorized testing only**
- Respects rate limiting and backoff
- Implements connection limits
- Logs all activities for audit

## 📈 **Monitoring & Stats**

Real-time statistics saved to `stats_*.json`:
```json
{
  "goods": 1247,
  "bads": 8934,
  "errors": 156,
  "offline": 89,
  "ipblock": 23,
  "processed": 10449,
  "rps": 2847.3,
  "uptime": "2m15s"
}
```

## Python Tools

Several helper scripts are written in Python. Install their dependencies with:

```bash
pip install -r requirements.txt
```

These scripts rely on the [`paramiko`](https://www.paramiko.org/) library for SSH automation.

---

**⚡ Built for maximum performance with real-world validation!**

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

Stay safe and happy hacking!
