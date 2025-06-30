#!/usr/bin/env python3
"""
Сбор результатов сканирования с удаленных воркеров
"""

import os
import sys
import time
import json
import random
import string
import paramiko
import argparse
from pathlib import Path
from datetime import datetime

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Collect Scan Results")
parser.add_argument("--credentials", default="credentials.txt", help="Файл с учетными данными SSH")
parser.add_argument("--remote-dir", default="/root/NAM/Servis", help="Удаленная директория со скриптами")
parser.add_argument("--output-dir", default="Valid", help="Локальная директория для результатов")
parser.add_argument("--verbose", action="store_true", help="Подробный вывод")
args = parser.parse_args()

def random_string(length=5):
    """Генерация случайной строки"""
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

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

def collect_results(ip, username, password):
    """Сбор результатов с удаленного воркера"""
    print(f"\n📥 Сбор результатов с {ip}")
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(ip, username=username, password=password, timeout=10)
        
        # Создаем локальную директорию для результатов
        os.makedirs(args.output_dir, exist_ok=True)
        
        # Получаем список файлов в удаленной директории
        sftp = client.open_sftp()
        
        try:
            remote_files = sftp.listdir(args.remote_dir)
        except Exception as e:
            print(f"❌ Ошибка получения списка файлов: {e}")
            sftp.close()
            client.close()
            return False
        
        # Ищем файлы с результатами
        valid_files = [f for f in remote_files if f.startswith("valid") and f.endswith(".txt")]
        stats_files = [f for f in remote_files if f.startswith("stats_") and f.endswith(".json")]
        
        if not valid_files and not stats_files:
            print(f"⚠️ Не найдены файлы с результатами на {ip}")
            sftp.close()
            client.close()
            return False
        
        # Загружаем файлы с результатами
        downloaded_count = 0
        
        # Загружаем valid*.txt
        for valid_file in valid_files:
            remote_path = f"{args.remote_dir}/{valid_file}"
            
            try:
                with sftp.file(remote_path, "r") as remote_f:
                    content = remote_f.read().decode("utf-8")
                
                if content.strip():
                    # Генерируем уникальное имя файла
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    random_suffix = random_string()
                    local_filename = f"{ip}_{valid_file}_{timestamp}_{random_suffix}.txt"
                    local_path = os.path.join(args.output_dir, local_filename)
                    
                    # Сохраняем содержимое в локальный файл
                    with open(local_path, "w", encoding="utf-8") as local_f:
                        local_f.write(content)
                    
                    print(f"✅ Загружен файл {valid_file} ({len(content.splitlines())} строк)")
                    downloaded_count += 1
                    
                    # Удаляем удаленный файл после загрузки
                    sftp.remove(remote_path)
                else:
                    print(f"⚠️ Файл {valid_file} пуст")
            except Exception as e:
                print(f"❌ Ошибка загрузки файла {valid_file}: {e}")
        
        # Загружаем stats_*.json
        for stats_file in stats_files:
            remote_path = f"{args.remote_dir}/{stats_file}"
            
            try:
                with sftp.file(remote_path, "r") as remote_f:
                    content = remote_f.read().decode("utf-8")
                
                # Парсим JSON для вывода статистики
                try:
                    stats = json.loads(content)
                    print(f"📊 Статистика с {ip}:")
                    print(f"  - Обработано: {stats.get('processed', 0)}")
                    print(f"  - Валидных: {stats.get('goods', 0)}")
                    print(f"  - Невалидных: {stats.get('bads', 0)}")
                    print(f"  - Ошибок: {stats.get('errors', 0)}")
                    print(f"  - Офлайн: {stats.get('offline', 0)}")
                    print(f"  - IP блокировок: {stats.get('ipblock', 0)}")
                except json.JSONDecodeError:
                    print(f"⚠️ Не удалось распарсить файл статистики {stats_file}")
            except Exception as e:
                print(f"❌ Ошибка чтения файла статистики {stats_file}: {e}")
        
        sftp.close()
        client.close()
        
        if downloaded_count > 0:
            print(f"✅ Загружено {downloaded_count} файлов с результатами с {ip}")
            return True
        else:
            print(f"⚠️ Не найдены файлы с валидными результатами на {ip}")
            return False
    
    except Exception as e:
        print(f"❌ Ошибка подключения к {ip}: {e}")
        return False

def main():
    """Основная функция"""
    print("📥 Сбор результатов сканирования с удаленных воркеров")
    
    # Парсим файл с учетными данными
    credentials = parse_credentials(args.credentials)
    if not credentials:
        print("❌ Не найдены учетные данные")
        return False
    
    print(f"📋 Найдено {len(credentials)} воркеров")
    
    # Собираем результаты с каждого воркера
    results = {}
    for ip, username, password in credentials:
        results[ip] = collect_results(ip, username, password)
    
    # Выводим общий результат
    print("\n📊 Результаты сбора:")
    success_count = sum(1 for success in results.values() if success)
    for ip, success in results.items():
        status = "✅" if success else "⚠️"
        print(f"{status} {ip}")
    
    # Объединяем все результаты в один файл
    output_dir = Path(args.output_dir)
    all_valid_path = output_dir / "all_valid_results.txt"
    
    try:
        # Собираем уникальные строки из всех файлов
        unique_lines = set()
        for result_file in output_dir.glob("*.txt"):
            if result_file.name == all_valid_path.name:
                continue
            
            with open(result_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        unique_lines.add(line)
        
        # Записываем уникальные строки в общий файл
        with open(all_valid_path, "w", encoding="utf-8") as f:
            for line in sorted(unique_lines):
                f.write(f"{line}\n")
        
        print(f"\n✅ Объединенные результаты сохранены в {all_valid_path}")
        print(f"📊 Всего найдено {len(unique_lines)} уникальных валидных учетных данных")
    except Exception as e:
        print(f"❌ Ошибка при объединении результатов: {e}")
    
    return success_count > 0

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Сбор результатов завершен успешно")
        else:
            print("\n⚠️ Сбор результатов завершен с предупреждениями")
    except KeyboardInterrupt:
        print("\n🛑 Сбор прерван пользователем")
        sys.exit(1)