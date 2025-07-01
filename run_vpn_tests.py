#!/usr/bin/env python3
"""
Запуск тестовых заданий для VPN вендоров
"""

import os
import sys
import json
import time
import argparse
import subprocess
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Run VPN Tests")
parser.add_argument("--config", default="vpn_test_config.json", help="Файл конфигурации тестов")
parser.add_argument("--vendor", help="Тестировать только указанный вендор")
parser.add_argument("--worker", help="Тестировать только на указанном воркере (IP)")
parser.add_argument("--output-dir", default="test_results", help="Директория для результатов")
parser.add_argument("--verbose", action="store_true", help="Подробный вывод")
args = parser.parse_args()

def run_command(cmd, description=None, check=True):
    """Запуск команды с выводом результата"""
    if description:
        print(f"📋 {description}")
    
    print(f"$ {' '.join(cmd)}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    
    if result.stderr:
        print(f"⚠️ {result.stderr}")
    
    if check and result.returncode != 0:
        print(f"❌ Команда завершилась с ошибкой (код {result.returncode})")
        return False
    
    return True

def main():
    """Основная функция"""
    print("🚀 Запуск тестовых заданий для VPN вендоров")
    
    # Проверяем наличие необходимых модулей
    try:
        import paramiko
    except ImportError:
        print("📦 Установка необходимых модулей...")
        run_command(["pip", "install", "paramiko"], "Установка paramiko")
    
    # Запускаем тестовые задания
    cmd = ["python3", "vpn_test_tasks.py"]
    
    if args.vendor:
        cmd.extend(["--vendor", args.vendor])
    
    if args.worker:
        cmd.extend(["--worker", args.worker])
    
    if args.output_dir:
        cmd.extend(["--output-dir", args.output_dir])
    
    if args.verbose:
        cmd.append("--verbose")
    
    if args.config:
        cmd.extend(["--config", args.config])
    
    run_command(cmd, "Запуск тестовых заданий")
    
    # Проверяем результаты
    if os.path.exists(args.output_dir):
        vendors = [d for d in os.listdir(args.output_dir) if os.path.isdir(os.path.join(args.output_dir, d))]
        
        print("\n📊 Результаты тестирования:")
        for vendor in vendors:
            vendor_dir = os.path.join(args.output_dir, vendor)
            valid_files = [f for f in os.listdir(vendor_dir) if f.endswith("_valid.txt")]
            stats_files = [f for f in os.listdir(vendor_dir) if f.endswith("_stats.json")]
            
            valid_count = 0
            for valid_file in valid_files:
                with open(os.path.join(vendor_dir, valid_file), "r") as f:
                    valid_count += len(f.readlines())
            
            print(f"✅ {vendor.upper()}: найдено {valid_count} валидных учетных данных на {len(valid_files)} воркерах")
            
            # Выводим статистику
            for stats_file in stats_files:
                worker_ip = stats_file.split("_")[0]
                with open(os.path.join(vendor_dir, stats_file), "r") as f:
                    stats = json.load(f)
                
                print(f"  - {worker_ip}: G:{stats.get('goods', 0)} B:{stats.get('bads', 0)} "
                      f"E:{stats.get('errors', 0)} Off:{stats.get('offline', 0)}")
    
    print("\n✅ Тестирование завершено!")
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Тестирование прервано пользователем")
        sys.exit(1)