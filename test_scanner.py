#!/usr/bin/env python3
"""
Test scanner for VPN credentials
"""

import os
import sys
import json
import time
import random
import argparse
from pathlib import Path

# Command line arguments
parser = argparse.ArgumentParser(description="VPN Scanner Simulator")
parser.add_argument("--vpn-type", default="fortinet", help="VPN type (fortinet, paloalto, sonicwall, sophos, watchguard, cisco)")
parser.add_argument("--creds-file", help="Credentials file")
parser.add_argument("--output", default="valid.txt", help="Output file for valid credentials")
args = parser.parse_args()

# Load credentials
creds_file = args.creds_file
if not creds_file:
    creds_file = f"creds/{args.vpn_type}.txt"

if not os.path.exists(creds_file):
    print(f"❌ Credentials file not found: {creds_file}")
    sys.exit(1)

with open(creds_file, "r") as f:
    credentials = [line.strip() for line in f if line.strip() and not line.startswith("#")]

# Statistics
stats = {
    "goods": 0,
    "bads": 0,
    "errors": 0,
    "offline": 0,
    "ipblock": 0,
    "processed": 0,
    "rps": 0
}

# Stats file
stats_file = f"stats_{os.getpid()}.json"

# Simulate scanning
print(f"🚀 Starting {args.vpn_type.upper()} scanner")
print(f"📊 Loaded {len(credentials)} credentials")

valid_file = open(args.output, "a")

try:
    start_time = time.time()
    for i, cred in enumerate(credentials):
        # Simulate delay
        time.sleep(random.uniform(0.1, 0.5))
        
        # For demo purposes, we'll mark all credentials as valid
        # In a real scanner, this would be determined by actual testing
        result = "valid"
        
        if result == "valid":
            stats["goods"] += 1
            valid_file.write(f"{cred}\n")
            valid_file.flush()
            print(f"✅ VALID: {cred}")
        elif result == "invalid":
            stats["bads"] += 1
        elif result == "error":
            stats["errors"] += 1
            print(f"❌ ERROR: {cred}")
        elif result == "offline":
            stats["offline"] += 1
            print(f"⏰ TIMEOUT: {cred}")
        elif result == "ipblock":
            stats["ipblock"] += 1
            print(f"🚫 BLOCKED: {cred}")
        
        stats["processed"] += 1
        stats["rps"] = stats["processed"] / (time.time() - start_time)
        
        # Update statistics
        if i % 5 == 0:
            with open(stats_file, "w") as f:
                json.dump(stats, f)
            
            # Display current statistics
            elapsed = time.time() - start_time
            print(f"\r🔥 G:{stats['goods']} B:{stats['bads']} E:{stats['errors']} Off:{stats['offline']} Blk:{stats['ipblock']} | ⚡{stats['rps']:.1f}/s | ⏱️{int(elapsed)}s", end="")
    
    print("\n✅ Scanning completed!")

except KeyboardInterrupt:
    print("\n🛑 Scanning interrupted by user")
finally:
    valid_file.close()
    with open(stats_file, "w") as f:
        json.dump(stats, f)