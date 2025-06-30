#!/usr/bin/env python3
"""
Менеджер сканеров VPN - запускает и управляет сканерами для разных типов VPN
"""

import os
import sys
import json
import time
import signal
import argparse
import subprocess
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="VPN Scanner Manager")
parser.add_argument("--vpn-type", help="Тип VPN для запуска (all для всех)")
parser.add_argument("--stop", action="store_true", help="Остановить сканеры")
parser.add_argument("--status", action="store_true", help="Показать статус сканеров")
args = parser.parse_args()

# Конфигурация сканеров
SCANNERS = {
    "fortinet": {
        "script": "sers1.py",
        "process_name": "sers1.py",
        "creds_file": "creds/fortinet.txt"
    },
    "paloalto": {
        "script": "sers2.go",
        "process_name": "sers2",
        "creds_file": "creds/paloalto.txt"
    },
    "sonicwall": {
        "script": "sers3.py",
        "process_name": "sers3.py",
        "creds_file": "creds/sonicwall.txt"
    },
    "cisco": {
        "script": "sers4.go",
        "process_name": "sers4",
        "creds_file": "creds/cisco.txt"
    },
    "sophos": {
        "script": "test_scanner.py",
        "process_name": "test_scanner.py",
        "creds_file": "creds/sophos.txt",
        "args": ["--vpn-type", "sophos"]
    },
    "watchguard": {
        "script": "test_scanner.py",
        "process_name": "test_scanner.py",
        "creds_file": "creds/watchguard.txt",
        "args": ["--vpn-type", "watchguard"]
    }
}

def get_running_scanners():
    """Получить список запущенных сканеров"""
    running = {}
    for vpn_type, config in SCANNERS.items():
        process_name = config["process_name"]
        try:
            # Проверяем, запущен ли процесс
            output = subprocess.check_output(["pgrep", "-f", process_name]).decode().strip()
            if output:
                pids = output.split("\n")
                running[vpn_type] = pids
        except subprocess.CalledProcessError:
            # Процесс не найден
            pass
    return running

def start_scanner(vpn_type):
    """Запустить сканер для указанного типа VPN"""
    if vpn_type not in SCANNERS:
        print(f"❌ Неизвестный тип VPN: {vpn_type}")
        return False
    
    config = SCANNERS[vpn_type]
    script = config["script"]
    creds_file = config.get("creds_file", "")
    
    # Проверяем, запущен ли уже сканер
    running = get_running_scanners()
    if vpn_type in running:
        print(f"⚠️ Сканер {vpn_type} уже запущен (PID: {', '.join(running[vpn_type])})")
        return False
    
    # Формируем команду запуска
    cmd = []
    if script.endswith(".py"):
        cmd = ["python3", script]
    elif script.endswith(".go"):
        cmd = ["go", "run", script]
    else:
        cmd = [script]
    
    # Добавляем аргументы
    if "args" in config:
        cmd.extend(config["args"])
    
    # Добавляем файл с учетными данными, если указан
    if creds_file:
        cmd.extend(["--creds-file", creds_file])
    
    # Запускаем процесс
    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"🚀 Запущен сканер {vpn_type} (PID: {process.pid})")
        return True
    except Exception as e:
        print(f"❌ Ошибка запуска сканера {vpn_type}: {e}")
        return False

def stop_scanner(vpn_type):
    """Остановить сканер для указанного типа VPN"""
    running = get_running_scanners()
    if vpn_type not in running:
        print(f"⚠️ Сканер {vpn_type} не запущен")
        return False
    
    for pid in running[vpn_type]:
        try:
            os.kill(int(pid), signal.SIGTERM)
            print(f"🛑 Остановлен сканер {vpn_type} (PID: {pid})")
        except Exception as e:
            print(f"❌ Ошибка остановки сканера {vpn_type} (PID: {pid}): {e}")
    
    return True

def show_status():
    """Показать статус всех сканеров"""
    running = get_running_scanners()
    
    print("\n📊 Статус сканеров:")
    print("=" * 50)
    
    for vpn_type, config in SCANNERS.items():
        status = "🟢 Запущен" if vpn_type in running else "🔴 Остановлен"
        pids = f"(PID: {', '.join(running[vpn_type])})" if vpn_type in running else ""
        print(f"{vpn_type.ljust(15)} {status} {pids}")
    
    print("=" * 50)
    
    # Показать статистику, если есть файлы stats_*.json
    stats_files = list(Path(".").glob("stats_*.json"))
    if stats_files:
        print("\n📈 Статистика сканирования:")
        print("=" * 50)
        
        total_stats = {
            "goods": 0,
            "bads": 0,
            "errors": 0,
            "offline": 0,
            "ipblock": 0,
            "processed": 0
        }
        
        for stats_file in stats_files:
            try:
                with open(stats_file, "r") as f:
                    stats = json.load(f)
                    pid = stats_file.stem.split("_")[1]
                    
                    # Обновляем общую статистику
                    for key in total_stats:
                        if key in stats:
                            total_stats[key] += stats[key]
                    
                    # Выводим статистику для каждого процесса
                    rps = stats.get("rps", 0)
                    print(f"PID {pid}: G:{stats.get('goods', 0)} B:{stats.get('bads', 0)} "
                          f"E:{stats.get('errors', 0)} Off:{stats.get('offline', 0)} "
                          f"Blk:{stats.get('ipblock', 0)} | ⚡{rps:.1f}/s")
            except Exception as e:
                print(f"Ошибка чтения {stats_file}: {e}")
        
        # Выводим общую статистику
        print("-" * 50)
        print(f"ВСЕГО: G:{total_stats['goods']} B:{total_stats['bads']} "
              f"E:{total_stats['errors']} Off:{total_stats['offline']} "
              f"Blk:{total_stats['ipblock']} | "
              f"Обработано: {total_stats['processed']}")
        print("=" * 50)

# Основная логика
if __name__ == "__main__":
    if args.status:
        show_status()
        sys.exit(0)
    
    if args.stop:
        if args.vpn_type and args.vpn_type != "all":
            stop_scanner(args.vpn_type)
        else:
            running = get_running_scanners()
            for vpn_type in running:
                stop_scanner(vpn_type)
        sys.exit(0)
    
    if args.vpn_type:
        if args.vpn_type == "all":
            for vpn_type in SCANNERS:
                start_scanner(vpn_type)
        else:
            start_scanner(args.vpn_type)
    else:
        parser.print_help()