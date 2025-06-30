#!/usr/bin/env python3
"""
Загрузка скриптов на SSH-воркеры
"""

import os
import sys
import paramiko
import argparse
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Upload Scripts to SSH Workers")
parser.add_argument("--credentials", default="credentials.txt", help="Файл с учетными данными SSH")
parser.add_argument("--scripts-dir", default="Servis", help="Директория со скриптами")
parser.add_argument("--remote-dir", default="/root/NAM/Servis", help="Удаленная директория для скриптов")
parser.add_argument("--verbose", action="store_true", help="Подробный вывод")
args = parser.parse_args()

def parse_credentials(filename):
    """Парсинг файла с учетными данными"""
    credentials = []
    try:
        with open(filename, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                
                parts = line.split(";")
                if len(parts) != 3:
                    print(f"⚠️ Неверный формат строки: {line}")
                    continue
                
                ip, username, password = parts
                credentials.append((ip, username, password))
        
        return credentials
    except Exception as e:
        print(f"❌ Ошибка при чтении файла {filename}: {e}")
        return []

def upload_scripts(ip, username, password):
    """Загрузка скриптов на воркер"""
    print(f"\n📤 Загрузка скриптов на {ip}")
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(ip, username=username, password=password, timeout=10)
        
        # Создаем удаленную директорию, если она не существует
        stdin, stdout, stderr = client.exec_command(f"mkdir -p {args.remote_dir}")
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status != 0:
            error = stderr.read().decode().strip()
            print(f"⚠️ Ошибка создания директории {args.remote_dir}: {error}")
        
        # Загружаем скрипты
        sftp = client.open_sftp()
        
        scripts_dir = Path(args.scripts_dir)
        if not scripts_dir.exists():
            print(f"❌ Директория со скриптами не найдена: {scripts_dir}")
            client.close()
            return False
        
        # Загружаем все файлы из директории со скриптами
        uploaded_count = 0
        for script_file in scripts_dir.glob("*"):
            if script_file.is_file():
                remote_path = f"{args.remote_dir}/{script_file.name}"
                if args.verbose:
                    print(f"📤 Загрузка {script_file} -> {remote_path}")
                
                sftp.put(str(script_file), remote_path)
                
                # Устанавливаем права на выполнение для скриптов
                if script_file.suffix in [".py", ".sh", ".go"]:
                    sftp.chmod(remote_path, 0o755)
                
                uploaded_count += 1
        
        sftp.close()
        
        # Загружаем тестовый сканер
        if os.path.exists("test_scanner.py"):
            sftp = client.open_sftp()
            remote_path = f"{args.remote_dir}/test_scanner.py"
            sftp.put("test_scanner.py", remote_path)
            sftp.chmod(remote_path, 0o755)
            sftp.close()
            uploaded_count += 1
        
        # Загружаем VPN сканер
        if os.path.exists("vpn_scanner.py"):
            sftp = client.open_sftp()
            remote_path = f"{args.remote_dir}/vpn_scanner.py"
            sftp.put("vpn_scanner.py", remote_path)
            sftp.chmod(remote_path, 0o755)
            sftp.close()
            uploaded_count += 1
        
        client.close()
        print(f"✅ Загружено {uploaded_count} файлов на {ip}")
        return True
    
    except Exception as e:
        print(f"❌ Ошибка загрузки скриптов на {ip}: {e}")
        return False

def main():
    """Основная функция"""
    print("🚀 Загрузка скриптов на SSH-воркеры")
    
    # Парсим файл с учетными данными
    credentials = parse_credentials(args.credentials)
    if not credentials:
        print("❌ Не найдены учетные данные")
        return False
    
    print(f"📋 Найдено {len(credentials)} воркеров")
    
    # Загружаем скрипты на каждый воркер
    results = {}
    for ip, username, password in credentials:
        results[ip] = upload_scripts(ip, username, password)
    
    # Выводим общий результат
    print("\n📊 Результаты загрузки:")
    success_count = sum(1 for success in results.values() if success)
    for ip, success in results.items():
        status = "✅" if success else "❌"
        print(f"{status} {ip}")
    
    print(f"\n✅ Успешно загружено на {success_count} из {len(credentials)} воркеров")
    return success_count == len(credentials)

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Загрузка скриптов завершена успешно")
        else:
            print("\n⚠️ Загрузка скриптов завершена с предупреждениями")
    except KeyboardInterrupt:
        print("\n🛑 Загрузка прервана пользователем")
        sys.exit(1)