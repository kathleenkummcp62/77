#!/usr/bin/env python3
"""
Запуск дашборда VPN сканера
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Start Dashboard")
parser.add_argument("--port", type=int, default=8080, help="Порт для запуска дашборда")
parser.add_argument("--dev", action="store_true", help="Запуск в режиме разработки")
args = parser.parse_args()

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
        return process

def main():
    """Основная функция"""
    print(f"🚀 Запуск дашборда VPN сканера на порту {args.port}")
    
    # Проверяем наличие необходимых файлов
    if not os.path.exists("cmd/dashboard/main.go"):
        print("❌ Не найден файл cmd/dashboard/main.go")
        return False
    
    # Запускаем дашборд
    cmd = ["go", "run", "cmd/dashboard/main.go", f"-port={args.port}"]
    
    if args.dev:
        # В режиме разработки запускаем в фоне
        process = run_command(cmd, wait=False)
        print(f"✅ Дашборд запущен в режиме разработки на порту {args.port}")
        print(f"📊 Доступен по адресу: http://localhost:{args.port}")
        print("Нажмите Ctrl+C для завершения...")
        
        try:
            process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Завершение работы...")
            process.terminate()
    else:
        # В обычном режиме запускаем в текущем процессе
        print(f"✅ Запуск дашборда на порту {args.port}")
        print(f"📊 Дашборд будет доступен по адресу: http://localhost:{args.port}")
        run_command(cmd, wait=True)
    
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Запуск прерван пользователем")
        sys.exit(1)