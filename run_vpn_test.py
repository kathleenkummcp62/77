#!/usr/bin/env python3
import os
import sys
import subprocess
import time
import argparse

parser = argparse.ArgumentParser(description="Run VPN Tests")
parser.add_argument("--vpn-type", default="all", help="VPN type to test (fortinet, paloalto, sonicwall, sophos, watchguard, cisco, all)")
args = parser.parse_args()

VPN_TYPES = ["fortinet", "paloalto", "sonicwall", "sophos", "watchguard", "cisco"]

def run_test(vpn_type):
    print(f"\n🚀 Testing {vpn_type.upper()} VPN...")
    
    # Use test_scanner.py for testing
    cmd = ["python3", "test_scanner.py", "--vpn-type", vpn_type, "--creds-file", f"creds/{vpn_type}.txt"]
    
    try:
        subprocess.run(cmd, check=True)
        print(f"✅ {vpn_type.upper()} test completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {vpn_type.upper()} test failed: {e}")
        return False
    except KeyboardInterrupt:
        print(f"🛑 {vpn_type.upper()} test interrupted")
        return False

if __name__ == "__main__":
    if args.vpn_type.lower() == "all":
        results = {}
        for vpn_type in VPN_TYPES:
            results[vpn_type] = run_test(vpn_type)
        
        # Print summary
        print("\n📊 Test Results:")
        for vpn_type, success in results.items():
            status = "✅" if success else "❌"
            print(f"{status} {vpn_type.upper()}")
    else:
        if args.vpn_type.lower() not in VPN_TYPES:
            print(f"❌ Unknown VPN type: {args.vpn_type}")
            print(f"Supported types: {', '.join(VPN_TYPES)}")
            sys.exit(1)
        
        run_test(args.vpn_type.lower())