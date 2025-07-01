#!/usr/bin/env python3
"""
Тестовые задания для различных VPN вендоров
Скрипт выполняет тестирование VPN сервисов на указанных воркерах
"""

import os
import sys
import json
import time
import random
import argparse
import paramiko
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# Аргументы командной строки
parser = argparse.ArgumentParser(description="VPN Test Tasks")
parser.add_argument("--config", default="vpn_test_config.json", help="Файл конфигурации тестов")
parser.add_argument("--vendor", help="Тестировать только указанный вендор (fortinet, paloalto, sonicwall, sophos, watchguard, cisco)")
parser.add_argument("--worker", help="Тестировать только на указанном воркере (IP)")
parser.add_argument("--output-dir", default="test_results", help="Директория для результатов")
parser.add_argument("--verbose", action="store_true", help="Подробный вывод")
args = parser.parse_args()

# Создаем директорию для результатов
os.makedirs(args.output_dir, exist_ok=True)

# Загрузка конфигурации тестов
def load_config(config_file):
    """Загрузка конфигурации тестов из JSON файла"""
    try:
        with open(config_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Ошибка загрузки конфигурации: {e}")
        sys.exit(1)

# Парсинг данных воркера
def parse_worker(worker_str):
    """Парсинг строки с данными воркера"""
    parts = worker_str.split(':')
    if len(parts) != 4:
        print(f"❌ Неверный формат данных воркера: {worker_str}")
        return None
    
    return {
        'ip': parts[0],
        'port': int(parts[1]),
        'username': parts[2],
        'password': parts[3]
    }

# Подключение к воркеру по SSH
def connect_to_worker(worker):
    """Подключение к воркеру по SSH"""
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            worker['ip'],
            port=worker['port'],
            username=worker['username'],
            password=worker['password'],
            timeout=10
        )
        return client
    except Exception as e:
        print(f"❌ Ошибка подключения к воркеру {worker['ip']}: {e}")
        return None

# Подготовка воркера
def prepare_worker(worker):
    """Подготовка воркера для тестирования"""
    client = connect_to_worker(worker)
    if not client:
        return False
    
    try:
        # Создаем необходимые директории
        stdin, stdout, stderr = client.exec_command("mkdir -p /root/NAM/Servis /root/NAM/Check")
        if stderr.read():
            print(f"⚠️ Предупреждение при создании директорий на {worker['ip']}")
        
        # Проверяем наличие Python и необходимых модулей
        stdin, stdout, stderr = client.exec_command("python3 -c 'import aiohttp, asyncio, aiofiles' 2>/dev/null || echo 'missing'")
        if stdout.read().decode().strip() == 'missing':
            print(f"📦 Устанавливаем необходимые модули на {worker['ip']}...")
            stdin, stdout, stderr = client.exec_command("pip3 install aiohttp aiofiles")
            if stderr.read():
                print(f"⚠️ Предупреждение при установке модулей на {worker['ip']}")
        
        # Загружаем тестовый сканер
        sftp = client.open_sftp()
        
        # Создаем временный файл сканера
        scanner_code = """#!/usr/bin/env python3
import os
import sys
import json
import time
import random
import asyncio
import aiohttp
import aiofiles
import argparse
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="VPN Scanner")
parser.add_argument("--vpn-type", required=True, help="Тип VPN")
parser.add_argument("--creds-file", required=True, help="Файл с учетными данными")
parser.add_argument("--output", default="valid.txt", help="Файл для результатов")
args = parser.parse_args()

# Загрузка учетных данных
with open(args.creds_file, "r") as f:
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

# Симуляция сканирования
async def main():
    print(f"🚀 Запуск сканера {args.vpn_type.upper()}")
    print(f"📊 Загружено {len(credentials)} учетных данных")
    
    start_time = time.time()
    
    # Открываем файл для валидных учетных данных
    async with aiofiles.open(args.output, "w") as valid_file:
        # Обрабатываем каждую учетную запись
        for cred in credentials:
            # Симулируем задержку
            await asyncio.sleep(random.uniform(0.5, 2.0))
            
            # Симулируем результат (для демонстрации)
            result = random.choice(["valid", "invalid", "error", "offline"])
            
            if result == "valid":
                stats["goods"] += 1
                await valid_file.write(f"{cred}\\n")
                print(f"✅ VALID: {cred}")
            elif result == "invalid":
                stats["bads"] += 1
                print(f"❌ INVALID: {cred}")
            elif result == "error":
                stats["errors"] += 1
                print(f"⚠️ ERROR: {cred}")
            elif result == "offline":
                stats["offline"] += 1
                print(f"🔌 OFFLINE: {cred}")
            
            stats["processed"] += 1
            stats["rps"] = stats["processed"] / (time.time() - start_time)
            
            # Обновляем статистику
            with open(stats_file, "w") as f:
                json.dump(stats, f)
            
            # Выводим текущую статистику
            print(f"\\r🔥 G:{stats['goods']} B:{stats['bads']} E:{stats['errors']} Off:{stats['offline']} Blk:{stats['ipblock']} | ⚡{stats['rps']:.1f}/s | ⏱️{int(time.time() - start_time)}s", end="")
    
    print("\\n✅ Сканирование завершено!")

if __name__ == "__main__":
    asyncio.run(main())
"""
        
        temp_scanner = Path("temp_scanner.py")
        with open(temp_scanner, "w") as f:
            f.write(scanner_code)
        
        sftp.put(str(temp_scanner), "/root/NAM/Servis/vpn_scanner.py")
        sftp.chmod("/root/NAM/Servis/vpn_scanner.py", 0o755)
        
        # Удаляем временный файл
        os.remove(temp_scanner)
        
        sftp.close()
        client.close()
        
        print(f"✅ Воркер {worker['ip']} подготовлен")
        return True
    except Exception as e:
        print(f"❌ Ошибка подготовки воркера {worker['ip']}: {e}")
        client.close()
        return False

# Создание файла с учетными данными для тестирования
def create_credentials_file(worker, vendor, targets):
    """Создание файла с учетными данными для тестирования"""
    client = connect_to_worker(worker)
    if not client:
        return False
    
    try:
        # Исправляем формат учетных данных (заменяем : на ;)
        fixed_targets = []
        for target in targets:
            fixed_target = target.replace(':', ';', 2)  # Заменяем только первые два двоеточия
            fixed_targets.append(fixed_target)
        
        # Создаем файл с учетными данными
        sftp = client.open_sftp()
        creds_file = f"/root/NAM/Check/{vendor}_creds.txt"
        with sftp.file(creds_file, "w") as f:
            f.write("\n".join(fixed_targets))
        
        sftp.close()
        client.close()
        
        print(f"✅ Файл с учетными данными для {vendor} создан на {worker['ip']}")
        return creds_file
    except Exception as e:
        print(f"❌ Ошибка создания файла с учетными данными на {worker['ip']}: {e}")
        client.close()
        return False

# Запуск тестового задания
def run_test_task(worker, vendor, creds_file):
    """Запуск тестового задания на воркере"""
    client = connect_to_worker(worker)
    if not client:
        return False
    
    try:
        # Запускаем сканер
        output_file = f"/root/NAM/Servis/valid_{vendor}.txt"
        command = f"cd /root/NAM/Servis && python3 vpn_scanner.py --vpn-type {vendor} --creds-file {creds_file} --output {output_file}"
        
        print(f"🚀 Запуск задания {vendor} на {worker['ip']}...")
        stdin, stdout, stderr = client.exec_command(command)
        
        # Ждем некоторое время для начала выполнения
        time.sleep(5)
        
        # Проверяем, запустился ли процесс
        stdin, stdout, stderr = client.exec_command("ps aux | grep vpn_scanner | grep -v grep")
        if not stdout.read():
            print(f"❌ Задание {vendor} не запустилось на {worker['ip']}")
            client.close()
            return False
        
        print(f"✅ Задание {vendor} запущено на {worker['ip']}")
        client.close()
        return True
    except Exception as e:
        print(f"❌ Ошибка запуска задания {vendor} на {worker['ip']}: {e}")
        client.close()
        return False

# Сбор результатов тестирования
def collect_results(worker, vendor):
    """Сбор результатов тестирования с воркера"""
    client = connect_to_worker(worker)
    if not client:
        return None
    
    try:
        # Проверяем наличие файла с результатами
        sftp = client.open_sftp()
        valid_file = f"/root/NAM/Servis/valid_{vendor}.txt"
        stats_file = None
        
        # Ищем файл статистики
        try:
            stats_files = [f for f in sftp.listdir("/root/NAM/Servis") if f.startswith("stats_") and f.endswith(".json")]
            if stats_files:
                stats_file = f"/root/NAM/Servis/{stats_files[0]}"
        except:
            pass
        
        results = {
            "valid_entries": [],
            "stats": None
        }
        
        # Получаем валидные учетные данные
        try:
            with sftp.file(valid_file, "r") as f:
                results["valid_entries"] = [line.strip() for line in f.readlines()]
        except:
            print(f"⚠️ Файл с валидными учетными данными не найден на {worker['ip']}")
        
        # Получаем статистику
        if stats_file:
            try:
                with sftp.file(stats_file, "r") as f:
                    results["stats"] = json.loads(f.read())
            except:
                print(f"⚠️ Ошибка чтения файла статистики на {worker['ip']}")
        
        sftp.close()
        client.close()
        
        return results
    except Exception as e:
        print(f"❌ Ошибка сбора результатов с {worker['ip']}: {e}")
        client.close()
        return None

# Сохранение результатов в локальный файл
def save_results(worker, vendor, results):
    """Сохранение результатов в локальный файл"""
    if not results:
        return False
    
    try:
        # Создаем директорию для результатов вендора
        vendor_dir = Path(args.output_dir) / vendor
        os.makedirs(vendor_dir, exist_ok=True)
        
        # Сохраняем валидные учетные данные
        valid_file = vendor_dir / f"{worker['ip']}_valid.txt"
        with open(valid_file, "w") as f:
            f.write("\n".join(results["valid_entries"]))
        
        # Сохраняем статистику
        if results["stats"]:
            stats_file = vendor_dir / f"{worker['ip']}_stats.json"
            with open(stats_file, "w") as f:
                json.dump(results["stats"], f, indent=2)
        
        print(f"✅ Результаты {vendor} с {worker['ip']} сохранены")
        return True
    except Exception as e:
        print(f"❌ Ошибка сохранения результатов {vendor} с {worker['ip']}: {e}")
        return False

# Основная функция
def main():
    """Основная функция"""
    print("🚀 Запуск тестовых заданий для VPN вендоров")
    
    # Загружаем конфигурацию
    config = load_config(args.config)
    
    # Парсим данные воркеров
    workers = [parse_worker(worker_str) for worker_str in config["workers"]]
    workers = [w for w in workers if w]  # Фильтруем None
    
    if not workers:
        print("❌ Не найдены валидные воркеры")
        return False
    
    print(f"📋 Найдено {len(workers)} воркеров")
    
    # Фильтруем воркеры, если указан конкретный
    if args.worker:
        workers = [w for w in workers if w['ip'] == args.worker]
        if not workers:
            print(f"❌ Воркер {args.worker} не найден")
            return False
    
    # Фильтруем вендоров, если указан конкретный
    vendors = list(config["tasks"].keys())
    if args.vendor:
        if args.vendor not in vendors:
            print(f"❌ Вендор {args.vendor} не найден")
            return False
        vendors = [args.vendor]
    
    print(f"📋 Тестирование {len(vendors)} вендоров: {', '.join(vendors)}")
    
    # Подготавливаем воркеры
    print("\n🔧 Подготовка воркеров...")
    prepared_workers = []
    for worker in workers:
        if prepare_worker(worker):
            prepared_workers.append(worker)
    
    if not prepared_workers:
        print("❌ Не удалось подготовить ни одного воркера")
        return False
    
    print(f"✅ Подготовлено {len(prepared_workers)} воркеров")
    
    # Распределяем задания между воркерами
    tasks = []
    for i, vendor in enumerate(vendors):
        worker = prepared_workers[i % len(prepared_workers)]
        targets = config["tasks"][vendor]["targets"]
        
        # Создаем файл с учетными данными
        creds_file = create_credentials_file(worker, vendor, targets)
        if not creds_file:
            continue
        
        # Запускаем задание
        if run_test_task(worker, vendor, creds_file):
            tasks.append({
                "worker": worker,
                "vendor": vendor,
                "creds_file": creds_file
            })
    
    if not tasks:
        print("❌ Не удалось запустить ни одного задания")
        return False
    
    print(f"✅ Запущено {len(tasks)} заданий")
    
    # Ждем некоторое время для выполнения заданий
    print("\n⏳ Ожидание выполнения заданий (30 секунд)...")
    time.sleep(30)
    
    # Собираем результаты
    print("\n📥 Сбор результатов...")
    for task in tasks:
        results = collect_results(task["worker"], task["vendor"])
        if results:
            save_results(task["worker"], task["vendor"], results)
    
    print("\n✅ Тестирование завершено!")
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Тестирование прервано пользователем")
        sys.exit(1)