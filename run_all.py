#!/usr/bin/env python3
"""
Запуск всех компонентов VPN сканера
"""

import os
import sys
import time
import signal
import argparse
import subprocess
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Run All Components")
parser.add_argument("--dashboard-port", type=int, default=8080, help="Порт для дашборда")
parser.add_argument("--setup", action="store_true", help="Выполнить настройку перед запуском")
parser.add_argument("--vpn-type", help="Тип VPN для запуска (all для всех)")
args = parser.parse_args()

# Список процессов для корректного завершения
processes = []

def signal_handler(sig, frame):
    """Обработчик сигналов для корректного завершения"""
    print("\n🛑 Завершение работы...")
    
    for process in processes:
        try:
            process.terminate()
        except:
            pass
    
    sys.exit(0)

# Регистрируем обработчик сигналов
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def run_command(cmd, wait=True):
    """Запуск команды"""
    print(f"📋 Выполнение: {' '.join(cmd)}")
    
    if wait:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(f"⚠️ {result.stderr}", file=sys.stderr)
        return result
    else:
        process = subprocess.Popen(cmd)
        processes.append(process)
        return process

def setup():
    """Настройка окружения"""
    if args.setup:
        print("🔧 Настройка окружения...")
        
        # Настройка дашборда
        run_command(["python3", "dashboard_setup.py", "--setup"])
        
        # Создание необходимых директорий
        os.makedirs("Generated", exist_ok=True)
        os.makedirs("Valid", exist_ok=True)
        
        print("✅ Настройка завершена")

def start_dashboard():
    """Запуск дашборда"""
    print(f"🚀 Запуск дашборда на порту {args.dashboard_port}...")
    dashboard_process = run_command(
        ["go", "run", "cmd/dashboard/main.go", f"-port={args.dashboard_port}"],
        wait=False
    )
    
    # Даем время на запуск
    time.sleep(2)
    
    if dashboard_process.poll() is not None:
        print("❌ Не удалось запустить дашборд")
        sys.exit(1)
    
    print(f"✅ Дашборд запущен: http://localhost:{args.dashboard_port}")

def start_scanners():
    """Запуск сканеров"""
    if args.vpn_type:
        print(f"🚀 Запуск сканеров для {args.vpn_type}...")
        
        cmd = ["python3", "scanner_manager.py"]
        if args.vpn_type:
            cmd.extend(["--vpn-type", args.vpn_type])
        
        run_command(cmd)
    else:
        print("ℹ️ Сканеры не запущены (не указан --vpn-type)")

# Основная логика
if __name__ == "__main__":
    print("🚀 Запуск всех компонентов VPN сканера")
    
    # Настройка окружения
    setup()
    
    # Запуск дашборда
    start_dashboard()
    
    # Запуск сканеров
    start_scanners()
    
    print("\n✅ Все компоненты запущены")
    print("Нажмите Ctrl+C для завершения...")
    
    # Ожидаем завершения всех процессов
    try:
        for process in processes:
            process.wait()
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)