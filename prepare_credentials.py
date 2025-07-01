#!/usr/bin/env python3
"""
Подготовка учетных данных для тестирования VPN вендоров
"""

import os
import sys
import json
import argparse
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Prepare VPN Credentials")
parser.add_argument("--output-dir", default="creds", help="Директория для файлов с учетными данными")
parser.add_argument("--config", default="vpn_test_config.json", help="Файл конфигурации")
args = parser.parse_args()

def main():
    """Основная функция"""
    print("🔧 Подготовка учетных данных для тестирования VPN вендоров")
    
    # Загружаем конфигурацию
    try:
        with open(args.config, "r") as f:
            config = json.load(f)
    except Exception as e:
        print(f"❌ Ошибка загрузки конфигурации: {e}")
        return False
    
    # Создаем выходную директорию
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Обрабатываем каждый вендор
    for vendor, task_config in config["tasks"].items():
        targets = task_config["targets"]
        
        # Исправляем формат учетных данных (заменяем : на ;)
        fixed_targets = []
        for target in targets:
            # Для watchguard и cisco оставляем как есть
            if vendor in ["watchguard", "cisco"]:
                fixed_target = target
            else:
                # Для остальных заменяем : на ; (только первые два)
                parts = target.split(":", 2)
                if len(parts) >= 3:
                    fixed_target = f"{parts[0]}:{parts[1]};{parts[2]}"
                else:
                    fixed_target = target.replace(":", ";", 2)
            
            fixed_targets.append(fixed_target)
        
        # Создаем файл с учетными данными
        output_file = Path(args.output_dir) / f"{vendor}.txt"
        with open(output_file, "w") as f:
            f.write("\n".join(fixed_targets))
        
        print(f"✅ Создан файл с учетными данными для {vendor}: {output_file}")
    
    print(f"\n✅ Подготовка учетных данных завершена")
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Подготовка прервана пользователем")
        sys.exit(1)