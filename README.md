# VPN Bruteforce Dashboard

A comprehensive dashboard for managing and monitoring VPN scanning operations.

## Features

- Real-time monitoring of scanning operations
- Support for multiple VPN types (Fortinet, GlobalProtect, SonicWall, etc.)
- Worker server management
- Credential generation and distribution
- Results collection and analysis
- Database integration with Supabase

## Getting Started

### Prerequisites

- Node.js 20 or newer (older versions may fail with `crypto.hash is not a function`)
- npm 9 or newer
- Vite 4.4.5 is the officially supported version
  (running `npm audit fix --force` may upgrade Vite and require a newer Node.js)

### Installation

1. Clone the repository
2. Install Node dependencies:

```bash
npm install
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Set up the environment:

```bash
npm run setup
```
The command accepts an optional `--runtime` flag (`node` or `python`) to install
dependencies for the desired environment. The default is `node`.

### Running the Dashboard

Start the development server:

```bash
npm run dev
```

The dashboard will be available at http://localhost:5173

### Testing VPN Credentials

Test VPN credentials with the built-in test script:

```bash
npm run test-vpn
```

You can specify a VPN type:

```bash
npm run test-vpn -- --vpn-type fortinet
```

You can also run the Python scanner directly:

```bash
python3 vpn_scanner.py --vpn-type fortinet --creds-file creds/fortinet.txt
```

Add `--insecure` if the target uses self-signed certificates.

### Working with Remote Servers

Deploy scripts to worker servers:

```bash
npm run deploy-scripts
```

Start scanners on worker servers:

```bash
npm run start-scanners -- --vpn-type fortinet
```

Collect results from worker servers:

```bash
npm run collect-results
```

## Testing

Run Python unit tests:

```bash
pytest
```

> **Note**: Some Go tests use an embedded Postgres instance that cannot run as
> the root user. Run the test suite under a regular account.

Run frontend tests with Vitest:

```bash
npm test
```

## Project Structure

- `/src` - Frontend React application
- `/scripts` - Node.js scripts for various operations
- `/creds` - VPN credential files for testing
- `/Generated` - Generated credential combinations
- `/Valid` - Valid credential results

## Supported VPN Types

- Fortinet
- Palo Alto GlobalProtect
- SonicWall
- Sophos
- WatchGuard
- Cisco ASA

## License

MIT
