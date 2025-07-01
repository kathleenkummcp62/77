#!/usr/bin/env python3
"""
Исправление формата учетных данных для VPN вендоров
Заменяет двоеточия на точки с запятой в файлах с учетными данными
"""

import os
import sys
import argparse
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Fix Credentials Format")
parser.add_argument("--input-dir", default="creds", help="Директория с файлами учетных данных")
parser.add_argument("--output-dir", default="creds_fixed", help="Директория для исправленных файлов")
args = parser.parse_args()

def fix_credentials_file(input_file, output_file):
    """Исправление формата учетных данных в файле"""
    try:
        with open(input_file, "r") as f:
            lines = f.readlines()
        
        fixed_lines = []
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                fixed_lines.append(line)
                continue
            
            # Заменяем двоеточия на точки с запятой (только первые два)
            parts = line.split(":", 2)
            if len(parts) >= 3:
                fixed_line = f"{parts[0]}:{parts[1]};{parts[2]}"
            else:
                fixed_line = line.replace(":", ";", 2)
            
            fixed_lines.append(fixed_line)
        
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w") as f:
            f.write("\n".join(fixed_lines))
        
        print(f"✅ Исправлен файл: {input_file} -> {output_file}")
        return True
    except Exception as e:
        print(f"❌ Ошибка исправления файла {input_file}: {e}")
        return False

def main():
    """Основная функция"""
    print("🔧 Исправление формата учетных данных для VPN вендоров")
    
    # Проверяем наличие директории с учетными данными
    input_dir = Path(args.input_dir)
    if not input_dir.exists() or not input_dir.is_dir():
        print(f"❌ Директория {input_dir} не найдена")
        return False
    
    # Создаем директорию для исправленных файлов
    output_dir = Path(args.output_dir)
    os.makedirs(output_dir, exist_ok=True)
    
    # Обрабатываем каждый файл
    success_count = 0
    for file in input_dir.glob("*.txt"):
        output_file = output_dir / file.name
        if fix_credentials_file(file, output_file):
            success_count += 1
    
    print(f"\n✅ Исправлено {success_count} файлов")
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Исправление прервано пользователем")
        sys.exit(1)