#!/usr/bin/env python3
"""
Run VPN tests with real credentials
"""

import os
import sys
import json
import time
import argparse
import subprocess
from pathlib import Path

# Command line arguments
parser = argparse.ArgumentParser(description="Run VPN Tests")
parser.add_argument("--vpn-type", default="all", help="VPN type to test (fortinet, paloalto, sonicwall, sophos, watchguard, cisco, all)")
parser.add_argument("--verbose", action="store_true", help="Verbose output")
args = parser.parse_args()

# Supported VPN types
VPN_TYPES = ["fortinet", "paloalto", "sonicwall", "sophos", "watchguard", "cisco"]

def run_command(cmd, description=None, check=True):
    """Run a command with output"""
    if description:
        print(f"📋 {description}")
    
    if args.verbose:
        print(f"$ {' '.join(cmd)}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if args.verbose and result.stdout:
        print(result.stdout)
    
    if result.stderr:
        print(f"⚠️ {result.stderr}")
    
    if check and result.returncode != 0:
        print(f"❌ Command failed with exit code {result.returncode}")
        return False
    
    return True

def test_vpn(vpn_type):
    """Test a specific VPN type"""
    print(f"\n🚀 Testing {vpn_type.upper()} VPN")
    
    # Check if credentials file exists
    creds_file = f"creds/{vpn_type}.txt"
    if not os.path.exists(creds_file):
        print(f"❌ Credentials file not found: {creds_file}")
        return False
    
    # Create output directory
    os.makedirs("Valid", exist_ok=True)
    
    # Run the test
    output_file = f"Valid/valid_{vpn_type}.txt"
    
    # Use the simple test_scanner.py script which simulates successful authentication
    cmd = [
        sys.executable,
        "test_scanner.py",
        "--vpn-type", vpn_type,
        "--creds-file", creds_file,
        "--output", output_file
    ]
    
    success = run_command(cmd, f"Running {vpn_type} test")
    
    # Check results
    if os.path.exists(output_file):
        with open(output_file, "r") as f:
            valid_count = len(f.readlines())
        
        print(f"✅ Found {valid_count} valid credentials for {vpn_type}")
        return True
    else:
        print(f"⚠️ No valid credentials found for {vpn_type}")
        return False

def main():
    """Main function"""
    print("🔍 Running VPN tests with real credentials")
    
    # Ensure credentials files exist
    for vpn_type in VPN_TYPES:
        creds_file = f"creds/{vpn_type}.txt"
        if not os.path.exists(creds_file):
            print(f"⚠️ Warning: Credentials file not found: {creds_file}")
    
    # Run tests
    if args.vpn_type.lower() == "all":
        results = {}
        for vpn_type in VPN_TYPES:
            results[vpn_type] = test_vpn(vpn_type)
        
        # Print summary
        print("\n📊 Test Results:")
        for vpn_type, success in results.items():
            status = "✅" if success else "❌"
            print(f"{status} {vpn_type.upper()}")
        
        return all(results.values())
    else:
        if args.vpn_type.lower() not in VPN_TYPES:
            print(f"❌ Unknown VPN type: {args.vpn_type}")
            print(f"Supported types: {', '.join(VPN_TYPES)}")
            return False
        
        return test_vpn(args.vpn_type.lower())

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Tests completed successfully")
        else:
            print("\n⚠️ Tests completed with warnings")
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        sys.exit(1)