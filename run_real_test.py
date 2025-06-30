#!/usr/bin/env python3
"""
Запуск реального тестирования VPN с использованием предоставленных учетных данных
"""

import os
import sys
import json
import time
import argparse
import subprocess
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Run Real VPN Test")
parser.add_argument("--vpn-type", default="all", help="Тип VPN для тестирования (fortinet, paloalto, sonicwall, sophos, watchguard, cisco, all)")
parser.add_argument("--verbose", action="store_true", help="Подробный вывод")
args = parser.parse_args()

# Поддерживаемые типы VPN
VPN_TYPES = ["fortinet", "paloalto", "sonicwall", "sophos", "watchguard", "cisco"]

def run_command(cmd, description=None, check=True):
    """Запуск команды с выводом результата"""
    if description:
        print(f"📋 {description}")
    
    if args.verbose:
        print(f"$ {' '.join(cmd)}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if args.verbose and result.stdout:
        print(result.stdout)
    
    if result.stderr:
        print(f"⚠️ {result.stderr}", file=sys.stderr)
    
    if check and result.returncode != 0:
        print(f"❌ Команда завершилась с ошибкой (код {result.returncode})")
        return False
    
    return True

def test_vpn(vpn_type):
    """Тестирование VPN определенного типа"""
    print(f"\n🚀 Тестирование {vpn_type.upper()} VPN")
    
    # Проверяем наличие файла с учетными данными
    creds_file = f"creds/{vpn_type}.txt"
    if not os.path.exists(creds_file):
        print(f"❌ Файл с учетными данными не найден: {creds_file}")
        return False
    
    # Запускаем тестовый сканер
    output_file = f"valid_{vpn_type}.txt"
    cmd = [
        "python3", "test_scanner.py",
        "--vpn-type", vpn_type,
        "--creds-file", creds_file,
        "--output", output_file
    ]
    
    if not run_command(cmd, f"Запуск тестового сканера для {vpn_type}"):
        return False
    
    # Проверяем результаты
    if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
        with open(output_file, "r") as f:
            valid_count = len(f.readlines())
        print(f"✅ Найдено {valid_count} валидных учетных данных для {vpn_type}")
        return True
    else:
        print(f"⚠️ Не найдено валидных учетных данных для {vpn_type}")
        return False

def main():
    """Основная функция"""
    print("🔍 Запуск реального тестирования VPN")
    
    # Проверяем наличие необходимых файлов
    if not os.path.exists("credentials.txt"):
        print("❌ Файл credentials.txt не найден")
        return False
    
    # Создаем директорию для результатов
    os.makedirs("Valid", exist_ok=True)
    
    # Запускаем тестирование для выбранных типов VPN
    if args.vpn_type == "all":
        results = {}
        for vpn_type in VPN_TYPES:
            results[vpn_type] = test_vpn(vpn_type)
        
        # Выводим общий результат
        print("\n📊 Результаты тестирования:")
        for vpn_type, success in results.items():
            status = "✅" if success else "❌"
            print(f"{status} {vpn_type.upper()}")
    else:
        if args.vpn_type not in VPN_TYPES:
            print(f"❌ Неизвестный тип VPN: {args.vpn_type}")
            print(f"Поддерживаемые типы: {', '.join(VPN_TYPES)}")
            return False
        
        test_vpn(args.vpn_type)
    
    return True

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Тестирование завершено успешно")
        else:
            print("\n❌ Тестирование завершено с ошибками")
    except KeyboardInterrupt:
        print("\n🛑 Тестирование прервано пользователем")
        sys.exit(1)