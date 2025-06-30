#!/usr/bin/env python3
"""
Настройка и запуск локального PostgreSQL для VPN сканера
"""

import os
import sys
import json
import time
import subprocess
import argparse
from pathlib import Path

# Аргументы командной строки
parser = argparse.ArgumentParser(description="PostgreSQL Setup")
parser.add_argument("--port", type=int, default=5432, help="Порт для PostgreSQL")
parser.add_argument("--user", default="postgres", help="Имя пользователя")
parser.add_argument("--password", default="postgres", help="Пароль")
parser.add_argument("--db-name", default="vpn_data", help="Имя базы данных")
parser.add_argument("--init-schema", action="store_true", help="Инициализировать схему базы данных")
args = parser.parse_args()

def run_command(cmd, check=True):
    """Запуск команды с выводом результата"""
    print(f"📋 Выполнение: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    
    if result.stderr:
        print(f"⚠️ {result.stderr}", file=sys.stderr)
    
    if check and result.returncode != 0:
        print(f"❌ Команда завершилась с ошибкой (код {result.returncode})")
        sys.exit(1)
    
    return result

def check_postgres_running():
    """Проверка, запущен ли PostgreSQL"""
    try:
        # Проверяем, запущен ли процесс postgres
        result = subprocess.run(
            ["pg_isready", "-h", "localhost", "-p", str(args.port)],
            capture_output=True, text=True
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False

def start_postgres():
    """Запуск PostgreSQL"""
    if check_postgres_running():
        print("✅ PostgreSQL уже запущен")
        return True
    
    print("🚀 Запуск PostgreSQL...")
    
    # Проверяем, установлен ли PostgreSQL
    try:
        run_command(["pg_ctl", "--version"], check=False)
    except FileNotFoundError:
        print("❌ PostgreSQL не установлен")
        print("Пожалуйста, установите PostgreSQL:")
        print("  - Ubuntu/Debian: sudo apt install postgresql")
        print("  - macOS: brew install postgresql")
        print("  - Windows: https://www.postgresql.org/download/windows/")
        return False
    
    # Запускаем PostgreSQL
    try:
        # Пытаемся запустить через pg_ctl
        data_dir = os.environ.get("PGDATA", "/usr/local/var/postgres")
        run_command(["pg_ctl", "-D", data_dir, "start"], check=False)
    except Exception as e:
        print(f"⚠️ Не удалось запустить PostgreSQL через pg_ctl: {e}")
        print("Пробуем альтернативные методы...")
        
        try:
            # Пытаемся запустить через systemd
            run_command(["sudo", "systemctl", "start", "postgresql"], check=False)
        except Exception as e:
            print(f"⚠️ Не удалось запустить PostgreSQL через systemd: {e}")
            
            try:
                # Пытаемся запустить через service
                run_command(["sudo", "service", "postgresql", "start"], check=False)
            except Exception as e:
                print(f"⚠️ Не удалось запустить PostgreSQL через service: {e}")
                return False
    
    # Проверяем, запустился ли PostgreSQL
    for _ in range(5):
        if check_postgres_running():
            print("✅ PostgreSQL успешно запущен")
            return True
        time.sleep(1)
    
    print("❌ Не удалось запустить PostgreSQL")
    return False

def create_database():
    """Создание базы данных"""
    print(f"🗄️ Создание базы данных {args.db_name}...")
    
    try:
        # Проверяем, существует ли база данных
        result = subprocess.run(
            ["psql", "-h", "localhost", "-p", str(args.port), "-U", args.user, "-lqt"],
            capture_output=True, text=True,
            env=dict(os.environ, PGPASSWORD=args.password)
        )
        
        if args.db_name in result.stdout:
            print(f"✅ База данных {args.db_name} уже существует")
            return True
        
        # Создаем базу данных
        run_command(
            ["createdb", "-h", "localhost", "-p", str(args.port), "-U", args.user, args.db_name],
            env=dict(os.environ, PGPASSWORD=args.password)
        )
        
        print(f"✅ База данных {args.db_name} создана")
        return True
    except Exception as e:
        print(f"❌ Ошибка создания базы данных: {e}")
        return False

def init_schema():
    """Инициализация схемы базы данных"""
    print("🔧 Инициализация схемы базы данных...")
    
    # SQL для создания таблиц
    tables_sql = [
        # VPN Credentials
        """
        CREATE TABLE IF NOT EXISTS vendor_urls (
            id SERIAL PRIMARY KEY,
            url TEXT NOT NULL
        )
        """,
        
        """
        CREATE TABLE IF NOT EXISTS credentials (
            id SERIAL PRIMARY KEY,
            ip TEXT NOT NULL,
            username TEXT NOT NULL,
            password TEXT NOT NULL
        )
        """,
        
        """
        CREATE TABLE IF NOT EXISTS proxies (
            id SERIAL PRIMARY KEY,
            address TEXT NOT NULL,
            username TEXT,
            password TEXT
        )
        """,
        
        """
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            vpn_type TEXT,
            vendor_url_id INTEGER REFERENCES vendor_urls(id),
            server TEXT,
            status TEXT
        )
        """,
        
        """
        CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            level TEXT,
            message TEXT,
            source TEXT
        )
        """
    ]
    
    try:
        # Выполняем SQL-запросы
        for sql in tables_sql:
            run_command(
                ["psql", "-h", "localhost", "-p", str(args.port), "-U", args.user, "-d", args.db_name, "-c", sql],
                env=dict(os.environ, PGPASSWORD=args.password)
            )
        
        print("✅ Схема базы данных инициализирована")
        return True
    except Exception as e:
        print(f"❌ Ошибка инициализации схемы: {e}")
        return False

def load_test_data():
    """Загрузка тестовых данных"""
    print("📊 Загрузка тестовых данных...")
    
    # Загружаем тестовые данные из файлов creds/*.txt
    try:
        # Добавляем URL-адреса VPN
        vpn_types = {
            "fortinet": ["https://200.113.15.26:4443", "https://195.150.192.5:443", "https://88.117.174.186:443"],
            "paloalto": ["https://216.229.124.44:443", "https://72.26.131.86:443", "https://216.247.223.23:443"],
            "sonicwall": ["https://69.21.239.19:4433", "https://68.189.7.50:4433", "https://74.92.44.25:4433"],
            "sophos": ["https://213.139.132.204:6443", "https://124.254.117.194:8443", "https://80.151.100.43:4433"],
            "watchguard": ["https://96.92.230.186:443", "https://75.146.37.105:444", "https://50.86.120.107:443"],
            "cisco": ["https://74.209.225.52:443", "https://67.202.240.148:443", "https://72.23.123.187:443"]
        }
        
        for vpn_type, urls in vpn_types.items():
            for url in urls:
                # Добавляем URL
                insert_url_sql = f"INSERT INTO vendor_urls (url) VALUES ('{url}') RETURNING id"
                result = subprocess.run(
                    ["psql", "-h", "localhost", "-p", str(args.port), "-U", args.user, "-d", args.db_name, "-t", "-c", insert_url_sql],
                    capture_output=True, text=True,
                    env=dict(os.environ, PGPASSWORD=args.password)
                )
                
                vendor_id = result.stdout.strip()
                
                # Добавляем задачу
                insert_task_sql = f"INSERT INTO tasks (vpn_type, vendor_url_id, server, status) VALUES ('{vpn_type}', {vendor_id}, 'server1.example.com', 'pending')"
                run_command(
                    ["psql", "-h", "localhost", "-p", str(args.port), "-U", args.user, "-d", args.db_name, "-c", insert_task_sql],
                    env=dict(os.environ, PGPASSWORD=args.password)
                )
        
        # Добавляем тестовые учетные данные из файлов
        creds_dir = Path("creds")
        for vpn_file in creds_dir.glob("*.txt"):
            if vpn_file.is_file():
                with open(vpn_file, "r") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        
                        parts = line.split(";")
                        if len(parts) >= 3:
                            ip = parts[0]
                            username = parts[1]
                            password = parts[2]
                            
                            # Экранируем специальные символы
                            ip = ip.replace("'", "''")
                            username = username.replace("'", "''")
                            password = password.replace("'", "''")
                            
                            insert_cred_sql = f"INSERT INTO credentials (ip, username, password) VALUES ('{ip}', '{username}', '{password}')"
                            run_command(
                                ["psql", "-h", "localhost", "-p", str(args.port), "-U", args.user, "-d", args.db_name, "-c", insert_cred_sql],
                                env=dict(os.environ, PGPASSWORD=args.password),
                                check=False
                            )
        
        # Добавляем тестовые прокси
        proxies = [
            "127.0.0.1:1080",
            "127.0.0.1:1081",
            "127.0.0.1:1082"
        ]
        
        for proxy in proxies:
            insert_proxy_sql = f"INSERT INTO proxies (address, username, password) VALUES ('{proxy}', 'proxyuser', 'proxypass')"
            run_command(
                ["psql", "-h", "localhost", "-p", str(args.port), "-U", args.user, "-d", args.db_name, "-c", insert_proxy_sql],
                env=dict(os.environ, PGPASSWORD=args.password)
            )
        
        # Добавляем тестовые логи
        logs = [
            ("info", "Система запущена", "system"),
            ("info", "Подключение к базе данных успешно", "database"),
            ("warning", "Высокая нагрузка на CPU", "system"),
            ("error", "Ошибка подключения к серверу 192.168.1.1", "scanner"),
            ("info", "Найдено 10 валидных учетных данных", "scanner")
        ]
        
        for level, message, source in logs:
            message = message.replace("'", "''")
            insert_log_sql = f"INSERT INTO logs (level, message, source) VALUES ('{level}', '{message}', '{source}')"
            run_command(
                ["psql", "-h", "localhost", "-p", str(args.port), "-U", args.user, "-d", args.db_name, "-c", insert_log_sql],
                env=dict(os.environ, PGPASSWORD=args.password)
            )
        
        print("✅ Тестовые данные загружены")
        return True
    except Exception as e:
        print(f"❌ Ошибка загрузки тестовых данных: {e}")
        return False

# Основная логика
if __name__ == "__main__":
    print("🔧 Настройка PostgreSQL для VPN сканера")
    
    # Запускаем PostgreSQL
    if not start_postgres():
        sys.exit(1)
    
    # Создаем базу данных
    if not create_database():
        sys.exit(1)
    
    # Инициализируем схему базы данных
    if args.init_schema:
        if not init_schema():
            sys.exit(1)
        
        # Загружаем тестовые данные
        if not load_test_data():
            sys.exit(1)
    
    print("\n✅ PostgreSQL настроен и готов к использованию")
    print(f"📊 Данные для подключения:")
    print(f"  - Хост: localhost")
    print(f"  - Порт: {args.port}")
    print(f"  - Пользователь: {args.user}")
    print(f"  - Пароль: {args.password}")
    print(f"  - База данных: {args.db_name}")