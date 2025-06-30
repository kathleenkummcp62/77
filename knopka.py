import paramiko
import threading
import sys
import subprocess
import argparse
import os

parser = argparse.ArgumentParser(description="Manage remote scripts")
parser.add_argument(
    "--remote-dir",
    default=os.environ.get("REMOTE_DIR", "/root/NAM/Servis"),
    help="Remote working directory on target servers",
)
args = parser.parse_args()
REMOTE_DIR = args.remote_dir

# Устанавливаем кодировку UTF-8 для стандартного ввода и вывода
sys.stdout.reconfigure(encoding='utf-8')
sys.stdin.reconfigure(encoding='utf-8')

def parse_credentials_file(filename):
    credentials = []
    with open(filename, 'r', encoding='utf-8') as file:
        for line in file:
            ip, username, password = line.strip().split(';')
            credentials.append((ip, username, password))
    return credentials

def run_sers_script(ip, username, password, script_number):
    script_mapping = {
        '6': 'sers1.py',
        '7': 'sers2.py',
        '8': 'sers3.py',
        '9': 'sers4.py'
    }
    script_name = script_mapping.get(script_number)
    if script_name:
        code = f'cd {REMOTE_DIR} && python3 {script_name}'
        run_remote_code(ip, username, password, code)
    else:
        print("Invalid script choice")

def run_remote_code(ip, username, password, code):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(ip, username=username, password=password, timeout=10)

        stdin, stdout, stderr = ssh.exec_command(code)

        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')

        ssh.close()

        if output:
            print(f"Результат выполнения на {ip}:")
            print(output)
        if error:
            print(f"Ошибка на {ip}:")
            print(error)
    except Exception as e:
        print(f"Ошибка при подключении или выполнении кода на {ip}: {str(e)}")

def handle_choice(choice):
    if choice == '1':
        print("run string generation")
        subprocess.run(["python", "generator.py"])
    elif choice == '2':
        print("splitting and uploading files to servers")
        subprocess.run(["python", "razdelitel.py"])
        subprocess.run(["python", "zagryzkatxt.py"])
    elif choice == '3':
        print("upload scripts to servers")
        subprocess.run(["python", "zagryzkaservisov.py"])
    elif choice == '4':
        print("collect valid strings from the servers")
        subprocess.run(["python", "parsgoodsserver.py"])
    elif choice == '5':
        print("the modules are being installed")
        subprocess.run(["python", "installmodule.py"])
        subprocess.run(["python", "bs4modul.py"])
    elif choice == '7':
        print("is in the process of removing scripts from the servers")
        subprocess.run(["python", "delete.py"])
    elif choice == '8':
        print("server reboot")
        subprocess.run(["python", "rebootssh.py"])
    else:
        print("Invalid choice")

def run_on_all_servers(choice, credentials):
    threads = []

    def run_on_all(ip, username, password):
        if choice in ['6']:
            code = f'cd {REMOTE_DIR} && python3 sers1.py'
            run_remote_code(ip, username, password, code)

    for ip, username, password in credentials:
        thread = threading.Thread(target=run_on_all, args=(ip, username, password))
        threads.append(thread)
        thread.start()

    for thread in threads:
        thread.join()

def show_menu():
    print("[1] Generator")
    print("[2] Uploading to servers")
    print("[3] Uploading script to server")
    print("[4] Pars Good")
    print("[5] Install module")
    print("[6] FortinetVPN")
    print("[7] MNC Delet")
    print("[8] ServerReboot")
    print("[0] Exit")

if __name__ == "__main__":
    credentials = parse_credentials_file('credentials.txt')
    
    while True:
        show_menu()
        choice = input("Введите ваш выбор (или 0 для выхода): ")
        if choice == '0':
            break
        if choice in ['6']:
            run_on_all_servers(choice, credentials)
        else:
            handle_choice(choice)
