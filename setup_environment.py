#!/usr/bin/env python3
"""
Setup environment for VPN Bruteforce Dashboard
This script installs required Python dependencies and sets up the environment
"""

import os
import sys
import subprocess
import platform

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
    
    credentials = [
        "194.0.234.203;root;1jt5a7p4FZTM0vY",
        "77.90.185.26;root;2dF9bS7UV6wvHy3",
        "185.93.89.206;root;G6t8NnHgI4i0x7K",
        "185.93.89.35;root;2asI5uvS047AqHM"
    ]
    
    with open("credentials.txt", "w") as f:
        f.write("\n".join(credentials))
    
    print("[INFO] credentials.txt created successfully")
    return True

def create_vpn_credential_files():
    """Create VPN credential files in creds directory."""
    print("[INFO] Creating VPN credential files...")
    
    vpn_credentials = {
        "fortinet.txt": [
            "https://200.113.15.26:4443;guest;guest",
            "https://195.150.192.5:443;guest;guest",
            "https://88.117.174.186:443;guest;guest",
            "https://118.238.205.22:10443;guest;guest",
            "https://49.205.180.172:10443;guest;guest",
            "https://37.142.24.153:10443;guest;guest",
            "https://206.74.89.110:10443;guest;guest",
            "https://222.119.99.24:10443;guest;guest",
            "https://220.241.67.242:3443;guest;guest"
        ],
        "paloalto.txt": [
            "https://216.229.124.44:443;test;test",
            "https://72.26.131.86:443;test;test",
            "https://216.247.223.23:443;test;test",
            "https://216.229.124.44:443;test;test",
            "https://72.26.131.86:443;test;test",
            "https://216.247.223.23:443;test;test"
        ],
        "sonicwall.txt": [
            "https://69.21.239.19:4433;test;test;LocalDomain",
            "https://68.189.7.50:4433;test;test;hudmech.local",
            "https://74.92.44.25:4433;test;test;microgroup.local",
            "https://96.70.252.65:4433;test;test;fm.local",
            "https://24.55.137.209:443;test;test;CMAAA15",
            "https://50.198.63.225:4433;test;test;MADISON",
            "https://96.89.127.141:4433;test;test;maloneysocular",
            "https://12.215.186.74:443;guest;guest;parksprings.com",
            "https://131.148.177.186:4433;guest;guest;dhte.dhtellc.com"
        ],
        "sophos.txt": [
            "https://213.139.132.204:6443;test;test;intern.gutenberg-shop.de",
            "https://124.254.117.194:8443;test;test;fcc.wa.edu.au",
            "https://80.151.100.43:4433;test;test;bilstein.local",
            "https://213.139.132.205:6443;test;test;intern.gutenberg-shop.de",
            "https://167.98.99.132:443;test;test;unknown_domain",
            "https://212.100.41.190:4445;test;test;verwaltung.local"
        ],
        "watchguard.txt": [
            "https://96.92.230.186:443:Firebox-DB:mpbchicago.masterpaperbox.com:printer:P@55w0rd",
            "https://75.146.37.105:444:Firebox-DB:comercial:P@ssw0rd123",
            "https://50.86.120.107:443:Firebox-DB:comercial:P@ssw0rd123",
            "https://35.131.180.112:443:Firebox-DB:engineer:eng1neer1",
            "https://98.100.209.218:443:Firebox-DB:chris:Welcome1!",
            "https://96.56.65.26:4100:AuthPoint:Firebox-DB:hudsonss.com:media:Password@1",
            "https://35.21.135.132:443:Firebox-DB:intranet:Password@1",
            "https://98.63.175.96:8595:Firebox-DB:download:Download#",
            "https://72.23.172.37:443:Firebox-DB:luis:pa$$w0rd",
            "https://12.2.120.90:4100:AuthPoint:Firebox-DB:RADIUS:banneroak.local:default:password@1"
        ],
        "cisco.txt": [
            "https://74.209.225.52:443:test:test:remote_access",
            "https://67.202.240.148:443:test:test:ANYCONNECT",
            "https://72.23.123.187:443:test:test:AnyConnect_HVAC",
            "https://72.32.124.5:443:test:test:POLITICALDATA-ANYCONNECT-SSL",
            "https://209.43.59.2:443:test:test:remote_access",
            "https://204.235.221.57:8443:test:test",
            "https://184.106.123.244:443:test:test:ANYCONNECT-GAVIOTA-SA",
            "https://72.73.71.60:443:guest:guest"
        ]
    }
    
    os.makedirs("creds", exist_ok=True)
    
    for filename, lines in vpn_credentials.items():
        with open(f"creds/{filename}", "w") as f:
            f.write("\n".join(lines))
        print(f"[INFO] Created creds/{filename}")
    
    return True

def main():
    print("=== VPN Bruteforce Dashboard Environment Setup ===")
    
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