#!/usr/bin/env python3
"""
Настройка SSH-воркеров для VPN сканера
"""

import os
import sys
import json
import time
import paramiko
import argparse
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Setup SSH Workers")
parser.add_argument("--credentials", default="credentials.txt", help="Файл с учетными данными SSH")
parser.add_argument("--test-only", action="store_true", help="Только проверка подключения")
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

def test_ssh_connection(ip, username, password):
    """Проверка SSH-подключения"""
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(ip, username=username, password=password, timeout=10)
        
        # Выполняем простую команду
        stdin, stdout, stderr = client.exec_command("uname -a")
        output = stdout.read().decode().strip()
        
        client.close()
        return True, output
    except Exception as e:
        return False, str(e)

def setup_worker(ip, username, password):
    """Настройка SSH-воркера"""
    print(f"\n🔧 Настройка воркера {ip}")
    
    # Проверяем подключение
    success, output = test_ssh_connection(ip, username, password)
    if not success:
        print(f"❌ Не удалось подключиться к {ip}: {output}")
        return False
    
    print(f"✅ Подключение к {ip} успешно")
    print(f"📋 Информация о системе: {output}")
    
    if args.test_only:
        return True
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(ip, username=username, password=password, timeout=10)
        
        # Создаем необходимые директории
        print(f"📁 Создание директорий на {ip}")
        commands = [
            "mkdir -p /root/NAM/Check",
            "mkdir -p /root/NAM/Servis",
            "mkdir -p /root/NAM/Config"
        ]
        
        for cmd in commands:
            if args.verbose:
                print(f"$ {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                error = stderr.read().decode().strip()
                print(f"⚠️ Ошибка выполнения команды {cmd}: {error}")
        
        # Загружаем конфигурационные файлы
        print(f"📤 Загрузка конфигурационных файлов на {ip}")
        
        sftp = client.open_sftp()
        
        # Загружаем config.txt
        config_content = "threads = 2500\n"
        with sftp.file("/root/NAM/Servis/config.txt", "w") as f:
            f.write(config_content)
        
        # Загружаем proxy_config.txt (пустой файл)
        with sftp.file("/root/NAM/Servis/proxy_config.txt", "w") as f:
            f.write("")
        
        sftp.close()
        
        # Проверяем наличие Python и необходимых пакетов
        print(f"🐍 Проверка Python на {ip}")
        stdin, stdout, stderr = client.exec_command("python3 --version")
        python_version = stdout.read().decode().strip()
        
        if not python_version:
            print(f"⚠️ Python не найден на {ip}")
            
            # Устанавливаем Python
            print(f"🔧 Установка Python на {ip}")
            stdin, stdout, stderr = client.exec_command("apt-get update && apt-get install -y python3 python3-pip")
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status != 0:
                error = stderr.read().decode().strip()
                print(f"❌ Ошибка установки Python: {error}")
                client.close()
                return False
        else:
            print(f"✅ {python_version} найден на {ip}")
        
        # Устанавливаем необходимые пакеты
        print(f"📦 Установка необходимых пакетов на {ip}")
        stdin, stdout, stderr = client.exec_command("pip3 install --break-system-packages aiohttp aiofiles")
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status != 0:
            # Пробуем без --break-system-packages
            stdin, stdout, stderr = client.exec_command("pip3 install aiohttp aiofiles")
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status != 0:
                error = stderr.read().decode().strip()
                print(f"⚠️ Ошибка установки пакетов: {error}")
                # Продолжаем, так как это не критическая ошибка
        
        client.close()
        print(f"✅ Воркер {ip} успешно настроен")
        return True
    
    except Exception as e:
        print(f"❌ Ошибка настройки воркера {ip}: {e}")
        return False

def main():
    """Основная функция"""
    print("🚀 Настройка SSH-воркеров для VPN сканера")
    
    # Парсим файл с учетными данными
    credentials = parse_credentials(args.credentials)
    if not credentials:
        print("❌ Не найдены учетные данные")
        return False
    
    print(f"📋 Найдено {len(credentials)} воркеров")
    
    # Настраиваем каждый воркер
    results = {}
    for ip, username, password in credentials:
        results[ip] = setup_worker(ip, username, password)
    
    # Выводим общий результат
    print("\n📊 Результаты настройки:")
    success_count = sum(1 for success in results.values() if success)
    for ip, success in results.items():
        status = "✅" if success else "❌"
        print(f"{status} {ip}")
    
    print(f"\n✅ Успешно настроено {success_count} из {len(credentials)} воркеров")
    return success_count == len(credentials)

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Настройка воркеров завершена успешно")
        else:
            print("\n⚠️ Настройка воркеров завершена с предупреждениями")
    except KeyboardInterrupt:
        print("\n🛑 Настройка прервана пользователем")
        sys.exit(1)