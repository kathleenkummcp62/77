#!/usr/bin/env python3
"""
Настройка и запуск дашборда VPN сканера
"""

import os
import sys
import json
import time
import subprocess
import argparse
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Dashboard Setup")
parser.add_argument("--port", type=int, default=8080, help="Порт для запуска дашборда")
parser.add_argument("--setup", action="store_true", help="Только настройка без запуска")
parser.add_argument("--dev", action="store_true", help="Запуск в режиме разработки")
args = parser.parse_args()

def run_command(cmd, check=True):
    """Запуск команды с выводом результата"""
    print(f"📋 Выполнение: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    
    if result.stderr:
        print(f"⚠️ {result.stderr}", file=sys.stderr)
    
    if check and result.returncode != 0:
        print(f"❌ Команда завершилась с ошибкой (код {result.returncode})")
        sys.exit(1)
    
    return result

def setup_dashboard():
    """Настройка дашборда"""
    print("🔧 Настройка дашборда...")
    
    # Проверка наличия необходимых инструментов
    try:
        run_command(["go", "version"])
        run_command(["node", "--version"])
        run_command(["npm", "--version"])
    except FileNotFoundError:
        print("❌ Не найдены необходимые инструменты (go, node, npm)")
        sys.exit(1)
    
    # Установка зависимостей Go
    print("📦 Установка зависимостей Go...")
    run_command(["go", "mod", "download"])
    
    # Установка зависимостей Node.js
    print("📦 Установка зависимостей Node.js...")
    run_command(["npm", "install"])
    
    # Сборка фронтенда
    print("🏗️ Сборка фронтенда...")
    run_command(["npm", "run", "build"])
    
    # Инициализация базы данных
    print("🗄️ Инициализация базы данных...")
    run_command(["python3", "setup_db.py"])
    
    print("✅ Настройка дашборда завершена")

def start_dashboard():
    """Запуск дашборда"""
    print(f"🚀 Запуск дашборда на порту {args.port}...")
    
    if args.dev:
        # Запуск в режиме разработки
        print("🔧 Запуск в режиме разработки")
        
        # Запуск бэкенда
        backend_cmd = ["go", "run", "cmd/dashboard/main.go", f"-port={args.port}"]
        backend_process = subprocess.Popen(backend_cmd)
        
        # Запуск фронтенда
        frontend_cmd = ["npm", "run", "dev", "--", "--port", str(args.port + 1)]
        frontend_process = subprocess.Popen(frontend_cmd)
        
        try:
            print(f"📊 Дашборд запущен:")
            print(f"  - Бэкенд: http://localhost:{args.port}")
            print(f"  - Фронтенд: http://localhost:{args.port + 1}")
            print("Нажмите Ctrl+C для завершения...")
            
            # Ждем завершения процессов
            backend_process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Завершение работы...")
            backend_process.terminate()
            frontend_process.terminate()
    else:
        # Запуск в production режиме
        cmd = ["go", "run", "cmd/dashboard/main.go", f"-port={args.port}"]
        try:
            subprocess.run(cmd)
        except KeyboardInterrupt:
            print("\n🛑 Завершение работы...")

# Основная логика
if __name__ == "__main__":
    # Настройка дашборда
    setup_dashboard()
    
    # Запуск дашборда, если не указан флаг --setup
    if not args.setup:
        start_dashboard()