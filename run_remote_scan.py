#!/usr/bin/env python3
"""
Запуск сканирования на удаленных воркерах
"""

import os
import sys
import time
import json
import paramiko
import argparse
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Run Remote Scan")
parser.add_argument("--credentials", default="credentials.txt", help="Файл с учетными данными SSH")
parser.add_argument("--vpn-type", required=True, help="Тип VPN для сканирования")
parser.add_argument("--remote-dir", default="/root/NAM/Servis", help="Удаленная директория со скриптами")
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

def get_script_for_vpn_type(vpn_type):
    """Получение имени скрипта для типа VPN"""
    scripts = {
        "fortinet": "sers1.py",
        "paloalto": "sers2.go",
        "sonicwall": "sers3.py",
        "sophos": "test_scanner.py --vpn-type sophos",
        "watchguard": "test_scanner.py --vpn-type watchguard",
        "cisco": "sers4.go"
    }
    
    return scripts.get(vpn_type.lower(), f"test_scanner.py --vpn-type {vpn_type}")

def run_remote_scan(ip, username, password):
    """Запуск сканирования на удаленном воркере"""
    print(f"\n🚀 Запуск сканирования на {ip}")
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(ip, username=username, password=password, timeout=10)
        
        # Определяем скрипт для запуска
        script = get_script_for_vpn_type(args.vpn_type)
        
        # Формируем команду
        if script.endswith(".py"):
            cmd = f"cd {args.remote_dir} && python3 {script}"
        elif script.endswith(".go"):
            cmd = f"cd {args.remote_dir} && go run {script}"
        else:
            cmd = f"cd {args.remote_dir} && ./{script}"
        
        print(f"📋 Выполнение команды: {cmd}")
        
        # Запускаем команду в фоновом режиме
        stdin, stdout, stderr = client.exec_command(f"nohup {cmd} > /dev/null 2>&1 &")
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status != 0:
            error = stderr.read().decode().strip()
            print(f"⚠️ Ошибка запуска сканирования: {error}")
            client.close()
            return False
        
        # Проверяем, запустился ли процесс
        time.sleep(2)
        if script.endswith(".py"):
            check_cmd = f"pgrep -f '{script}'"
        elif script.endswith(".go"):
            check_cmd = f"pgrep -f '{script.split()[0]}'"
        else:
            check_cmd = f"pgrep -f '{script}'"
        
        stdin, stdout, stderr = client.exec_command(check_cmd)
        pid = stdout.read().decode().strip()
        
        if pid:
            print(f"✅ Сканирование запущено на {ip} (PID: {pid})")
            client.close()
            return True
        else:
            print(f"❌ Не удалось запустить сканирование на {ip}")
            client.close()
            return False
    
    except Exception as e:
        print(f"❌ Ошибка подключения к {ip}: {e}")
        return False

def main():
    """Основная функция"""
    print(f"🚀 Запуск сканирования {args.vpn_type.upper()} на удаленных воркерах")
    
    # Проверяем тип VPN
    valid_vpn_types = ["fortinet", "paloalto", "sonicwall", "sophos", "watchguard", "cisco"]
    if args.vpn_type.lower() not in valid_vpn_types:
        print(f"⚠️ Неизвестный тип VPN: {args.vpn_type}")
        print(f"Поддерживаемые типы: {', '.join(valid_vpn_types)}")
    
    # Парсим файл с учетными данными
    credentials = parse_credentials(args.credentials)
    if not credentials:
        print("❌ Не найдены учетные данные")
        return False
    
    print(f"📋 Найдено {len(credentials)} воркеров")
    
    # Запускаем сканирование на каждом воркере
    results = {}
    for ip, username, password in credentials:
        results[ip] = run_remote_scan(ip, username, password)
    
    # Выводим общий результат
    print("\n📊 Результаты запуска:")
    success_count = sum(1 for success in results.values() if success)
    for ip, success in results.items():
        status = "✅" if success else "❌"
        print(f"{status} {ip}")
    
    print(f"\n✅ Успешно запущено на {success_count} из {len(credentials)} воркеров")
    return success_count > 0

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Запуск сканирования завершен успешно")
        else:
            print("\n❌ Запуск сканирования завершен с ошибками")
    except KeyboardInterrupt:
        print("\n🛑 Запуск прерван пользователем")
        sys.exit(1)