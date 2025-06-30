#!/usr/bin/env python3
"""
Инициализация базы данных для VPN сканера
"""

import os
import json
import sqlite3
from pathlib import Path

# Создаем базу данных SQLite (для тестирования)
db_path = "vpn_scanner.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Создаем таблицы
cursor.execute('''
CREATE TABLE IF NOT EXISTS vendor_urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS proxies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    username TEXT,
    password TEXT
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vpn_type TEXT,
    vendor_url_id INTEGER,
    server TEXT,
    status TEXT,
    FOREIGN KEY (vendor_url_id) REFERENCES vendor_urls (id)
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level TEXT,
    message TEXT,
    source TEXT
)
''')

# Добавляем тестовые данные
# VPN URLs
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
        cursor.execute("INSERT INTO vendor_urls (url) VALUES (?)", (url,))
        vendor_id = cursor.lastrowid
        cursor.execute("INSERT INTO tasks (vpn_type, vendor_url_id, server, status) VALUES (?, ?, ?, ?)",
                      (vpn_type, vendor_id, "server1.example.com", "pending"))

# Добавляем тестовые учетные данные
creds_dir = Path("creds")
for vpn_file in creds_dir.glob("*.txt"):
    vpn_type = vpn_file.stem
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
                cursor.execute("INSERT INTO credentials (ip, username, password) VALUES (?, ?, ?)",
                              (ip, username, password))

# Добавляем тестовые прокси
proxies = [
    "127.0.0.1:1080",
    "127.0.0.1:1081",
    "127.0.0.1:1082"
]

for proxy in proxies:
    cursor.execute("INSERT INTO proxies (address, username, password) VALUES (?, ?, ?)",
                  (proxy, "proxyuser", "proxypass"))

# Добавляем тестовые логи
logs = [
    ("info", "Система запущена", "system"),
    ("info", "Подключение к базе данных успешно", "database"),
    ("warning", "Высокая нагрузка на CPU", "system"),
    ("error", "Ошибка подключения к серверу 192.168.1.1", "scanner"),
    ("info", "Найдено 10 валидных учетных данных", "scanner")
]

for level, message, source in logs:
    cursor.execute("INSERT INTO logs (level, message, source) VALUES (?, ?, ?)",
                  (level, message, source))

# Сохраняем изменения
conn.commit()
conn.close()

print(f"✅ База данных инициализирована: {db_path}")
print(f"📊 Добавлено:")
print(f"  - {sum(len(urls) for urls in vpn_types.values())} URL-адресов")
print(f"  - {sum(len(urls) for urls in vpn_types.values())} задач")
print(f"  - {len(proxies)} прокси")
print(f"  - {len(logs)} записей логов")