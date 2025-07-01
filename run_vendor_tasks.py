#!/usr/bin/env python3
"""
Run VPN vendor tasks using real credentials and workers
"""

import os
import sys
import json
import time
import paramiko
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# Command line arguments
parser = argparse.ArgumentParser(description="Run VPN Vendor Tasks")
parser.add_argument("--credentials", default="credentials.txt", help="SSH credentials file")
parser.add_argument("--vpn-type", default="all", help="VPN type to test (fortinet, paloalto, sonicwall, sophos, watchguard, cisco, all)")
parser.add_argument("--remote-dir", default="/root/NAM/Servis", help="Remote directory for scripts")
parser.add_argument("--verbose", action="store_true", help="Verbose output")
args = parser.parse_args()

# VPN types and their corresponding scripts
VPN_SCRIPTS = {
    "fortinet": "sers1.py",
    "paloalto": "sers2.go",
    "sonicwall": "sers3.py",
    "cisco": "sers4.go",
    "sophos": "vpn_scanner.py --vpn-type sophos",
    "watchguard": "vpn_scanner.py --vpn-type watchguard"
}

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

def connect_to_server(ip, username, password):
    """Connect to server via SSH"""
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(ip, username=username, password=password, timeout=10)
        return client
    except Exception as e:
        print(f"❌ Error connecting to {ip}: {e}")
        return None

def prepare_server(ip, username, password):
    """Prepare server for task execution"""
    client = connect_to_server(ip, username, password)
    if not client:
        return False
    
    try:
        # Create necessary directories
        stdin, stdout, stderr = client.exec_command(f"mkdir -p {args.remote_dir}")
        if stderr.read():
            print(f"⚠️ Warning when creating directories on {ip}")
        
        # Check if Python and required modules are installed
        stdin, stdout, stderr = client.exec_command("python3 -c 'import aiohttp, asyncio, aiofiles' 2>/dev/null || echo 'missing'")
        if stdout.read().decode().strip() == 'missing':
            print(f"📦 Installing required modules on {ip}...")
            stdin, stdout, stderr = client.exec_command("pip3 install aiohttp aiofiles")
            if stderr.read():
                print(f"⚠️ Warning when installing modules on {ip}")
        
        client.close()
        print(f"✅ Server {ip} prepared successfully")
        return True
    except Exception as e:
        print(f"❌ Error preparing server {ip}: {e}")
        client.close()
        return False

def upload_creds_file(ip, username, password, vpn_type):
    """Upload credentials file for specific VPN type"""
    client = connect_to_server(ip, username, password)
    if not client:
        return False
    
    try:
        # Check if creds file exists locally
        local_creds_file = f"creds/{vpn_type}.txt"
        if not os.path.exists(local_creds_file):
            print(f"❌ Credentials file not found: {local_creds_file}")
            client.close()
            return False
        
        # Upload creds file
        sftp = client.open_sftp()
        remote_creds_file = f"{args.remote_dir}/{vpn_type}_creds.txt"
        sftp.put(local_creds_file, remote_creds_file)
        sftp.close()
        
        client.close()
        print(f"✅ Uploaded credentials for {vpn_type} to {ip}")
        return remote_creds_file
    except Exception as e:
        print(f"❌ Error uploading credentials to {ip}: {e}")
        client.close()
        return False

def run_vpn_task(ip, username, password, vpn_type):
    """Run VPN task on server"""
    client = connect_to_server(ip, username, password)
    if not client:
        return False
    
    try:
        # Upload credentials file
        remote_creds_file = upload_creds_file(ip, username, password, vpn_type)
        if not remote_creds_file:
            client.close()
            return False
        
        # Get script command
        script_cmd = VPN_SCRIPTS.get(vpn_type)
        if not script_cmd:
            print(f"❌ Unknown VPN type: {vpn_type}")
            client.close()
            return False
        
        # Prepare command
        if script_cmd.endswith(".py"):
            if "vpn_scanner.py" in script_cmd:
                cmd = f"cd {args.remote_dir} && python3 {script_cmd} --creds-file {remote_creds_file} --output {args.remote_dir}/valid_{vpn_type}.txt"
            else:
                cmd = f"cd {args.remote_dir} && python3 {script_cmd}"
        elif script_cmd.endswith(".go"):
            cmd = f"cd {args.remote_dir} && go run {script_cmd}"
        else:
            cmd = f"cd {args.remote_dir} && ./{script_cmd}"
        
        # Run command in background
        print(f"🚀 Running {vpn_type} task on {ip}...")
        stdin, stdout, stderr = client.exec_command(f"nohup {cmd} > /dev/null 2>&1 &")
        
        # Check if command started successfully
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            print(f"❌ Failed to start {vpn_type} task on {ip}")
            client.close()
            return False
        
        # Verify process is running
        time.sleep(2)
        if script_cmd.endswith(".py"):
            check_cmd = f"pgrep -f '{script_cmd.split()[0]}'"
        elif script_cmd.endswith(".go"):
            check_cmd = f"pgrep -f '{script_cmd.split()[0]}'"
        else:
            check_cmd = f"pgrep -f '{script_cmd}'"
        
        stdin, stdout, stderr = client.exec_command(check_cmd)
        process_id = stdout.read().decode().strip()
        
        if process_id:
            print(f"✅ {vpn_type} task started on {ip} (PID: {process_id})")
            client.close()
            return True
        else:
            print(f"❌ Could not verify {vpn_type} task is running on {ip}")
            client.close()
            return False
    except Exception as e:
        print(f"❌ Error running {vpn_type} task on {ip}: {e}")
        client.close()
        return False

def main():
    """Main function"""
    print("🚀 Running VPN vendor tasks with real credentials and workers")
    
    # Parse credentials
    credentials = parse_credentials(args.credentials)
    if not credentials:
        print("❌ No valid credentials found")
        return False
    
    print(f"📋 Found {len(credentials)} workers")
    
    # Determine which VPN types to run
    vpn_types = list(VPN_SCRIPTS.keys())
    if args.vpn_type.lower() != "all":
        if args.vpn_type.lower() not in vpn_types:
            print(f"❌ Unknown VPN type: {args.vpn_type}")
            print(f"Supported types: {', '.join(vpn_types)}")
            return False
        vpn_types = [args.vpn_type.lower()]
    
    print(f"📋 Will run tasks for {len(vpn_types)} VPN types: {', '.join(vpn_types)}")
    
    # Prepare servers
    prepared_servers = []
    for ip, username, password in credentials:
        if prepare_server(ip, username, password):
            prepared_servers.append((ip, username, password))
    
    if not prepared_servers:
        print("❌ No servers were successfully prepared")
        return False
    
    print(f"✅ {len(prepared_servers)} servers prepared successfully")
    
    # Distribute tasks among servers
    tasks = []
    for i, vpn_type in enumerate(vpn_types):
        # Round-robin assignment of tasks to servers
        server_idx = i % len(prepared_servers)
        ip, username, password = prepared_servers[server_idx]
        
        tasks.append({
            "ip": ip,
            "username": username,
            "password": password,
            "vpn_type": vpn_type
        })
    
    # Run tasks
    results = {}
    with ThreadPoolExecutor(max_workers=min(10, len(tasks))) as executor:
        for task in tasks:
            future = executor.submit(
                run_vpn_task,
                task["ip"],
                task["username"],
                task["password"],
                task["vpn_type"]
            )
            results[f"{task['ip']}_{task['vpn_type']}"] = future
    
    # Check results
    success_count = 0
    for task_id, future in results.items():
        ip, vpn_type = task_id.split("_", 1)
        if future.result():
            success_count += 1
    
    print(f"\n✅ Successfully started {success_count} out of {len(tasks)} tasks")
    
    if success_count > 0:
        print("\n📊 Task Summary:")
        for task in tasks:
            task_id = f"{task['ip']}_{task['vpn_type']}"
            status = "✅ Running" if results[task_id].result() else "❌ Failed"
            print(f"{status} - {task['vpn_type']} on {task['ip']}")
        
        print("\n💡 To collect results, run:")
        print("python3 collect_results.py")
    
    return success_count > 0

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Task execution completed successfully")
        else:
            print("\n⚠️ Task execution completed with warnings")
    except KeyboardInterrupt:
        print("\n🛑 Task execution interrupted by user")
        sys.exit(1)