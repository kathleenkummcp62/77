#!/usr/bin/env python3
"""
Тестовый сканер для проверки VPN учетных данных
"""

import os
import sys
import json
import time
import random
import argparse
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="VPN Scanner Simulator")
parser.add_argument("--vpn-type", default="fortinet", help="Тип VPN (fortinet, paloalto, sonicwall, sophos, watchguard, cisco)")
parser.add_argument("--creds-file", help="Файл с учетными данными")
parser.add_argument("--output", default="valid.txt", help="Файл для сохранения валидных учетных данных")
args = parser.parse_args()

# Загрузка учетных данных
creds_file = args.creds_file
if not creds_file:
    creds_file = f"creds/{args.vpn_type}.txt"

if not os.path.exists(creds_file):
    print(f"Файл с учетными данными не найден: {creds_file}")
    sys.exit(1)

with open(creds_file, "r") as f:
    credentials = [line.strip() for line in f if line.strip() and not line.startswith("#")]

# Статистика
stats = {
    "goods": 0,
    "bads": 0,
    "errors": 0,
    "offline": 0,
    "ipblock": 0,
    "processed": 0,
    "rps": 0
}

# Файл для статистики
stats_file = f"stats_{os.getpid()}.json"

# Имитация сканирования
print(f"🚀 Запуск сканера {args.vpn_type.upper()}")
print(f"📊 Загружено {len(credentials)} учетных данных")

valid_file = open(args.output, "a")

try:
    start_time = time.time()
    for i, cred in enumerate(credentials):
        # Имитация задержки
        time.sleep(random.uniform(0.1, 0.5))
        
        # Случайный результат для демонстрации
        result = random.choices(
            ["valid", "invalid", "error", "offline", "ipblock"],
            weights=[0.1, 0.7, 0.1, 0.05, 0.05],
            k=1
        )[0]
        
        if result == "valid":
            stats["goods"] += 1
            valid_file.write(f"{cred}\n")
            valid_file.flush()
            print(f"✅ VALID: {cred}")
        elif result == "invalid":
            stats["bads"] += 1
        elif result == "error":
            stats["errors"] += 1
            print(f"❌ ERROR: {cred}")
        elif result == "offline":
            stats["offline"] += 1
            print(f"⏰ TIMEOUT: {cred}")
        elif result == "ipblock":
            stats["ipblock"] += 1
            print(f"🚫 BLOCKED: {cred}")
        
        stats["processed"] += 1
        stats["rps"] = stats["processed"] / (time.time() - start_time)
        
        # Обновление статистики
        if i % 5 == 0:
            with open(stats_file, "w") as f:
                json.dump(stats, f)
            
            # Вывод текущей статистики
            elapsed = time.time() - start_time
            print(f"\r🔥 G:{stats['goods']} B:{stats['bads']} E:{stats['errors']} Off:{stats['offline']} Blk:{stats['ipblock']} | ⚡{stats['rps']:.1f}/s | ⏱️{int(elapsed)}s", end="")
    
    print("\n✅ Сканирование завершено!")

except KeyboardInterrupt:
    print("\n🛑 Сканирование прервано пользователем")
finally:
    valid_file.close()
    with open(stats_file, "w") as f:
        json.dump(stats, f)