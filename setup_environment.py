#!/usr/bin/env python3
"""
Setup environment for VPN Bruteforce Dashboard
This script installs required Python dependencies and sets up the environment
"""

import os
import sys
import subprocess
import platform
import json
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent / 'setup-data.json'
vpn_credentials = {}
ssh_credentials = []

def load_setup_data():
    global vpn_credentials, ssh_credentials
    try:
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
        vpn_credentials = data.get('vpnCredentials', {})
        ssh_credentials = data.get('sshCredentials', [])
    except Exception as e:
        print(f"[ERROR] Failed to load setup data: {e}")

def run_command(cmd, description=None, check=True):
    """Run a shell command and handle errors."""
    if description:
        print(f"[INFO] {description}...")
    
    try:
        result = subprocess.run(cmd, shell=True, check=check, capture_output=True, text=True)
        if result.stdout:
            print(f"[OUTPUT] {result.stdout.strip()}")
        if result.stderr and not result.returncode == 0:
            print(f"[ERROR] {result.stderr.strip()}")
        return result.returncode == 0
    except Exception as e:
        print(f"[ERROR] Failed to execute command: {e}")
        return False

def install_pip():
    """Install pip if not available."""
    print("[INFO] Checking for pip...")
    
    # Check if pip is already installed
    if run_command(f"{sys.executable} -m pip --version", check=False):
        print("[INFO] pip is already installed")
        return True
    
    print("[INFO] pip not found, attempting to install...")
    
    # Different installation methods based on platform
    if platform.system() == "Linux":
        # Try apt-get for Debian/Ubuntu
        if run_command("which apt-get", check=False):
            run_command("apt-get update -qq", "Updating package lists")
            return run_command("apt-get install -y python3-pip", "Installing python3-pip")
        # Try yum for CentOS/RHEL
        elif run_command("which yum", check=False):
            return run_command("yum install -y python3-pip", "Installing python3-pip")
        else:
            print("[ERROR] Unsupported Linux distribution")
            return False
    elif platform.system() == "Darwin":  # macOS
        return run_command("curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && python3 get-pip.py", 
                         "Installing pip via bootstrap script")
    elif platform.system() == "Windows":
        return run_command("curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && python get-pip.py",
                         "Installing pip via bootstrap script")
    else:
        print(f"[ERROR] Unsupported platform: {platform.system()}")
        return False

def install_dependencies():
    """Install required Python dependencies."""
    print("[INFO] Installing required Python dependencies...")
    
    # Try to install with regular pip first
    success = run_command(f"{sys.executable} -m pip install paramiko", "Installing paramiko")
    
    # If that fails, try with --break-system-packages (for PEP 668 compliance)
    if not success:
        print("[INFO] Retrying with --break-system-packages flag (for PEP 668 compliance)")
        success = run_command(f"{sys.executable} -m pip install --break-system-packages paramiko", 
                            "Installing paramiko with break-system-packages")
    
    # If still failing, try with user install
    if not success:
        print("[INFO] Retrying with --user flag")
        success = run_command(f"{sys.executable} -m pip install --user paramiko",
                            "Installing paramiko for current user only")
    
    return success

def setup_directories():
    """Create necessary directories."""
    print("[INFO] Setting up directories...")
    
    directories = [
        "Generated",
        "Valid",
        "creds/dictionaries"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"[INFO] Created directory: {directory}")
    
    return True

def create_credentials_file():
    """Create credentials.txt file with SSH credentials."""
    print("[INFO] Creating credentials.txt file...")

    with open("credentials.txt", "w") as f:
        f.write("\n".join(ssh_credentials))
    
    print("[INFO] credentials.txt created successfully")
    return True

def create_vpn_credential_files():
    """Create VPN credential files in creds directory."""
    print("[INFO] Creating VPN credential files...")
    
    os.makedirs("creds", exist_ok=True)

    for vpn_type, lines in vpn_credentials.items():
        filename = f"{vpn_type}.txt"
        with open(f"creds/{filename}", "w") as f:
            f.write("\n".join(lines))
        print(f"[INFO] Created creds/{filename}")
    
    return True

def main():
    print("=== VPN Bruteforce Dashboard Environment Setup ===")

    load_setup_data()
    
    # Step 1: Install pip if needed
    if not install_pip():
        print("[ERROR] Failed to install pip. Please install it manually.")
        return False
    
    # Step 2: Install required dependencies
    if not install_dependencies():
        print("[ERROR] Failed to install required dependencies.")
        return False
    
    # Step 3: Setup directories
    setup_directories()
    
    # Step 4: Create credentials file
    create_credentials_file()
    
    # Step 5: Create VPN credential files
    create_vpn_credential_files()
    
    print("\n[SUCCESS] Environment setup completed successfully!")
    print("\nYou can now run the following commands:")
    print("  - python3 setup_workers.py --test-only  (to test SSH connections)")
    print("  - python3 test_scanner.py --vpn-type fortinet  (to test VPN scanning)")
    print("  - npm run dev  (to start the dashboard)")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n[INFO] Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        sys.exit(1)