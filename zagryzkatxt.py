#!/usr/bin/env python3
"""
zagryzkatxt.py
──────────────
⮞ Разбирает credentials.txt  
⮞ Для каждого воркера загружает СВОЙ файл:
    • если воркеров несколько → part_1.txt, part_2.txt, …  
    • если воркер только один → gener.txt  
⮞ Создаёт целевую папку /root/NAM/Check на сервере.
"""

import os
import sys
from pathlib import Path
import paramiko

CRED_FILE     = "credentials.txt"
LOCAL_SPLIT   = Path("." )           # где лежат part_*.txt и gener.txt
REMOTE_FOLDER = '/root/NAM/Check'    # конечная папка на сервере
SSH_TIMEOUT   = 10                   # сек.

def parse_creds(path: str):
    creds = []
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            ip, user, secret = map(str.strip, line.split(";"))
            creds.append((ip, user, secret))
        except ValueError:
            print(f"[WARN] пропускаю строку: {line}")
    return creds

def ssh_client(ip, user, secret):
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        if Path(secret).expanduser().is_file():
            key = paramiko.RSAKey.from_private_key_file(Path(secret).expanduser())
            cli.connect(ip, username=user, pkey=key, timeout=SSH_TIMEOUT)
        else:
            cli.connect(ip, username=user, password=secret, timeout=SSH_TIMEOUT)
        return cli
    except Exception as e:
        print(f"[!!] {ip}: SSH error → {e}")
        return None

def upload(ip, user, secret, local_file: Path):
    if not local_file.exists():
        print(f"[!!] {ip}: локальный файл {local_file} не найден")
        return
    cli = ssh_client(ip, user, secret)
    if not cli:
        return
    try:
        cli.exec_command(f"mkdir -p {REMOTE_FOLDER}")
        sftp = cli.open_sftp()
        remote_path = f"{REMOTE_FOLDER}/{local_file.name}"
        sftp.put(str(local_file), remote_path)
        sftp.close()
        print(f"[OK]  {ip}: загрузил {local_file.name}")
    except Exception as e:
        print(f"[!!] {ip}: ошибка загрузки → {e}")
    finally:
        cli.close()

def main():
    creds = parse_creds(CRED_FILE)
    if not creds:
        sys.exit("credentials.txt пуст или не найден")

    many_hosts = len(creds) > 1
    for idx, (ip, user, secret) in enumerate(creds, start=1):
        # выбираем нужный файл
        if many_hosts:
            local_name = f"part_{idx}.txt"
        else:
            local_name = "gener.txt"

        local_path = LOCAL_SPLIT / local_name
        upload(ip, user, secret, local_path)

if __name__ == "__main__":
    main()
