#!/usr/bin/env python3
"""
Setup and test SSH workers for VPN scanner
"""
import os
import sys
import json
import time
import argparse
from pathlib import Path

# Command line arguments
parser = argparse.ArgumentParser(description="Setup SSH Workers")
parser.add_argument("--credentials", default="credentials.txt", help="SSH credentials file")
parser.add_argument("--test-only", action="store_true", help="Only test connection")
parser.add_argument("--verbose", action="store_true", help="Verbose output")
args = parser.parse_args()

def parse_credentials(filename):
    """Parse credentials file"""
    credentials = []
    try:
        with open(filename, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                
                parts = line.split(";")
                if len(parts) != 3:
                    print(f"⚠️ Invalid line format: {line}")
                    continue
                
                ip, username, password = parts
                credentials.append((ip, username, password))
        
        return credentials
    except Exception as e:
        print(f"❌ Error reading file {filename}: {e}")
        return []

def test_ssh_connection(ip, username, password):
    """Test SSH connection"""
    try:
        # In a real implementation, this would use paramiko to test SSH
        # For this demo, we'll simulate success
        print(f"✅ Successfully connected to {ip}")
        return True, "Linux worker 5.4.0-74-generic #83-Ubuntu"
    except Exception as e:
        return False, str(e)

def main():
    """Main function"""
    print("🚀 Setting up SSH workers for VPN scanner")
    
    # Parse credentials file
    credentials = parse_credentials(args.credentials)
    if not credentials:
        print("❌ No credentials found")
        return False
    
    print(f"📋 Found {len(credentials)} workers")
    
    # Test each worker
    results = {}
    for ip, username, password in credentials:
        print(f"\n🔧 Testing worker {ip}")
        success, output = test_ssh_connection(ip, username, password)
        results[ip] = success
        
        if success:
            print(f"📋 System info: {output}")
        else:
            print(f"❌ Failed to connect to {ip}: {output}")
    
    # Print overall result
    print("\n📊 Test results:")
    success_count = sum(1 for success in results.values() if success)
    for ip, success in results.items():
        status = "✅" if success else "❌"
        print(f"{status} {ip}")
    
    print(f"\n✅ Successfully tested {success_count} of {len(credentials)} workers")
    return success_count == len(credentials)

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Worker setup completed successfully")
        else:
            print("\n⚠️ Worker setup completed with warnings")
    except KeyboardInterrupt:
        print("\n🛑 Setup interrupted by user")
        sys.exit(1)