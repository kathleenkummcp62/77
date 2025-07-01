#!/usr/bin/env python3
"""
Collect VPN vendor task results from worker servers
"""

import os
import sys
import json
import time
import random
import string
import paramiko
import argparse
from pathlib import Path
from datetime import datetime

# Command line arguments
parser = argparse.ArgumentParser(description="Collect VPN Vendor Results")
parser.add_argument("--credentials", default="credentials.txt", help="SSH credentials file")
parser.add_argument("--remote-dir", default="/root/NAM/Servis", help="Remote directory with results")
parser.add_argument("--output-dir", default="Valid", help="Local directory for results")
parser.add_argument("--verbose", action="store_true", help="Verbose output")
args = parser.parse_args()

def random_string(length=5):
    """Generate a random string"""
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

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

def collect_results(ip, username, password):
    """Collect results from a worker server"""
    print(f"\n📥 Collecting results from {ip}")
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(ip, username=username, password=password, timeout=10)
        
        # Create local output directory
        os.makedirs(args.output_dir, exist_ok=True)
        
        # Get list of files in remote directory
        sftp = client.open_sftp()
        
        try:
            remote_files = sftp.listdir(args.remote_dir)
        except Exception as e:
            print(f"❌ Error getting file list: {e}")
            sftp.close()
            client.close()
            return False
        
        # Find result files
        valid_files = [f for f in remote_files if f.startswith("valid_") and f.endswith(".txt")]
        stats_files = [f for f in remote_files if f.startswith("stats_") and f.endswith(".json")]
        
        if not valid_files and not stats_files:
            print(f"⚠️ No result files found on {ip}")
            sftp.close()
            client.close()
            return False
        
        # Download result files
        downloaded_count = 0
        
        # Download valid_*.txt files
        for valid_file in valid_files:
            remote_path = f"{args.remote_dir}/{valid_file}"
            
            try:
                with sftp.file(remote_path, "r") as remote_f:
                    content = remote_f.read().decode("utf-8")
                
                if content.strip():
                    # Generate unique filename
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    random_suffix = random_string()
                    local_filename = f"{ip}_{valid_file}_{timestamp}_{random_suffix}.txt"
                    local_path = os.path.join(args.output_dir, local_filename)
                    
                    # Save content to local file
                    with open(local_path, "w", encoding="utf-8") as local_f:
                        local_f.write(content)
                    
                    print(f"✅ Downloaded {valid_file} ({len(content.splitlines())} lines)")
                    downloaded_count += 1
                    
                    # Remove remote file after download
                    sftp.remove(remote_path)
                else:
                    print(f"⚠️ File {valid_file} is empty")
            except Exception as e:
                print(f"❌ Error downloading file {valid_file}: {e}")
        
        # Download stats_*.json files
        for stats_file in stats_files:
            remote_path = f"{args.remote_dir}/{stats_file}"
            
            try:
                with sftp.file(remote_path, "r") as remote_f:
                    content = remote_f.read().decode("utf-8")
                
                # Parse JSON for statistics output
                try:
                    stats = json.loads(content)
                    print(f"📊 Statistics from {ip}:")
                    print(f"  - Processed: {stats.get('processed', 0)}")
                    print(f"  - Valid: {stats.get('goods', 0)}")
                    print(f"  - Invalid: {stats.get('bads', 0)}")
                    print(f"  - Errors: {stats.get('errors', 0)}")
                    print(f"  - Offline: {stats.get('offline', 0)}")
                    print(f"  - IP blocks: {stats.get('ipblock', 0)}")
                except json.JSONDecodeError:
                    print(f"⚠️ Could not parse stats file {stats_file}")
            except Exception as e:
                print(f"❌ Error reading stats file {stats_file}: {e}")
        
        sftp.close()
        client.close()
        
        if downloaded_count > 0:
            print(f"✅ Downloaded {downloaded_count} result files from {ip}")
            return True
        else:
            print(f"⚠️ No valid result files found on {ip}")
            return False
    
    except Exception as e:
        print(f"❌ Error connecting to {ip}: {e}")
        return False

def main():
    """Main function"""
    print("📥 Collecting VPN vendor task results from worker servers")
    
    # Parse credentials file
    credentials = parse_credentials(args.credentials)
    if not credentials:
        print("❌ No credentials found")
        return False
    
    print(f"📋 Found {len(credentials)} workers")
    
    # Collect results from each worker
    results = {}
    for ip, username, password in credentials:
        results[ip] = collect_results(ip, username, password)
    
    # Print summary
    print("\n📊 Collection results:")
    success_count = sum(1 for success in results.values() if success)
    for ip, success in results.items():
        status = "✅" if success else "⚠️"
        print(f"{status} {ip}")
    
    # Combine all results into one file
    output_dir = Path(args.output_dir)
    all_valid_path = output_dir / "all_valid_results.txt"
    
    try:
        # Collect unique lines from all files
        unique_lines = set()
        for result_file in output_dir.glob("*.txt"):
            if result_file.name == all_valid_path.name:
                continue
            
            with open(result_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        unique_lines.add(line)
        
        # Write unique lines to combined file
        with open(all_valid_path, "w", encoding="utf-8") as f:
            for line in sorted(unique_lines):
                f.write(f"{line}\n")
        
        print(f"\n✅ Combined results saved to {all_valid_path}")
        print(f"📊 Total unique valid credentials: {len(unique_lines)}")
    except Exception as e:
        print(f"❌ Error combining results: {e}")
    
    return success_count > 0

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Collection completed successfully")
        else:
            print("\n⚠️ Collection completed with warnings")
    except KeyboardInterrupt:
        print("\n🛑 Collection interrupted by user")
        sys.exit(1)