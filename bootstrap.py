#!/usr/bin/env python3
"""bootstrap.py
===============
Bootstrap script to install pip and basic Python packages required by the main scripts.
This resolves the circular dependency where installmodule.py needs paramiko but pip isn't installed.
"""

import subprocess
import sys
import os

def run_command(cmd, description):
    """Run a shell command and handle errors."""
    print(f"[INFO] {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        if result.stdout:
            print(f"[SUCCESS] {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] {description} failed:")
        if e.stdout:
            print(f"STDOUT: {e.stdout}")
        if e.stderr:
            print(f"STDERR: {e.stderr}")
        return False

def check_pip():
    """Check if pip is available."""
    try:
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                      check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError:
        return False

def install_pip():
    """Install pip using apt-get."""
    print("[INFO] pip not found, attempting to install python3-pip...")
    
    # Update package list
    if not run_command("sudo apt-get update -qq", "Updating package list"):
        return False
    
    # Install python3-pip
    if not run_command("sudo apt-get install -y python3-pip", "Installing python3-pip"):
        return False
    
    return True

def install_basic_packages():
    """Install basic packages required by the main scripts."""
    packages = ["paramiko"]
    
    for package in packages:
        print(f"[INFO] Installing {package}...")
        cmd = f"{sys.executable} -m pip install {package}"
        
        # Try normal install first
        if run_command(cmd, f"Installing {package}"):
            continue
            
        # If that fails, try with --break-system-packages (for PEP 668)
        print(f"[INFO] Retrying {package} with --break-system-packages...")
        cmd_break = f"{sys.executable} -m pip install --break-system-packages {package}"
        if not run_command(cmd_break, f"Installing {package} with --break-system-packages"):
            print(f"[ERROR] Failed to install {package}")
            return False
    
    return True

def main():
    print("=== Python Environment Bootstrap ===")
    print("This script will install pip and basic requirements for the main scripts.")
    
    # Check if we're running as root or have sudo access
    if os.geteuid() != 0:
        try:
            subprocess.run(["sudo", "-n", "true"], check=True, capture_output=True)
        except subprocess.CalledProcessError:
            print("[ERROR] This script requires sudo access to install system packages.")
            print("Please run with sudo or ensure you have sudo privileges.")
            sys.exit(1)
    
    # Check if pip is available
    if check_pip():
        print("[INFO] pip is already available")
    else:
        if not install_pip():
            print("[ERROR] Failed to install pip")
            sys.exit(1)
        
        # Verify pip installation
        if not check_pip():
            print("[ERROR] pip installation verification failed")
            sys.exit(1)
        
        print("[SUCCESS] pip installed successfully")
    
    # Install basic packages
    if install_basic_packages():
        print("[SUCCESS] All basic packages installed successfully")
        print("\n[INFO] You can now run your main scripts:")
        print("  - python3 installmodule.py  (to install additional packages on remote servers)")
        print("  - python3 knopka.py         (main menu interface)")
    else:
        print("[ERROR] Failed to install some basic packages")
        sys.exit(1)

if __name__ == "__main__":
    main()