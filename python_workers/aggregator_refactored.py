#!/usr/bin/env python3
"""
Улучшенный агрегатор статистики
Собирает и объединяет статистику со всех воркеров
"""

from __future__ import annotations
import json
import time
import sys
import argparse
import asyncio
import aiofiles
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field, asdict

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("aggregator.log")
    ]
)
logger = logging.getLogger("aggregator")

@dataclass
class AggregatedStats:
    """Агрегированная статистика со всех воркеров"""
    goods: int = 0
    bads: int = 0
    errors: int = 0
    offline: int = 0
    ipblock: int = 0
    processed: int = 0
    rps: float = 0.0
    servers: int = 0
    active_servers: int = 0
    start_time: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование в словарь для JSON"""
        result = asdict(self)
        result.pop('start_time')  # Не включаем время старта в JSON
        result['timestamp'] = int(time.time())
        result['uptime'] = int(time.time() - self.start_time)
        return result
    
    def update_rps(self) -> None:
        """Обновление RPS"""
        elapsed = time.time() - self.start_time
        if elapsed > 0:
            self.rps = self.processed / elapsed

@dataclass
class ServerStats:
    """Статистика отдельного сервера"""
    ip: str
    goods: int = 0
    bads: int = 0
    errors: int = 0
    offline: int = 0
    ipblock: int = 0
    processed: int = 0
    rps: float = 0.0
    timestamp: int = 0
    
    @classmethod
    def from_dict(cls, ip: str, data: Dict[str, Any]) -> 'ServerStats':
        """Создание из словаря"""
        return cls(
            ip=ip,
            goods=data.get('goods', 0),
            bads=data.get('bads', 0),
            errors=data.get('errors', 0),
            offline=data.get('offline', 0),
            ipblock=data.get('ipblock', 0),
            processed=data.get('processed', 0),
            rps=data.get('rps', 0.0),
            timestamp=data.get('timestamp', int(time.time()))
        )

@dataclass
class AggregatorConfig:
    """Конфигурация агрегатора"""
    stats_dir: str
    output_file: str
    poll_interval: int
    verbose: bool
    
    @classmethod
    def from_args(cls, args: argparse.Namespace) -> 'AggregatorConfig':
        """Создание конфигурации из аргументов командной строки"""
        return cls(
            stats_dir=args.stats_dir,
            output_file=args.output,
            poll_interval=args.interval,
            verbose=args.verbose
        )

def human_time(sec: int) -> str:
    """Форматирование времени в человекочитаемый вид"""
    m, s = divmod(int(sec), 60)
    h, m = divmod(m, 60)
    return f"{h:02}:{m:02}:{s:02}"

class StatsAggregator:
    """Агрегатор статистики со всех воркеров"""
    
    def __init__(self, config: AggregatorConfig):
        self.config = config
        self.stats = AggregatedStats()
        self.server_stats: Dict[str, ServerStats] = {}
        self.stats_dir = Path(config.stats_dir)
        self.output_file = Path(config.output_file)
        
        # Создаем директорию для статистики, если она не существует
        self.stats_dir.mkdir(exist_ok=True, parents=True)
    
    async def collect_stats(self) -> None:
        """Сбор статистики со всех воркеров"""
        # Сбрасываем агрегированную статистику
        self.stats = AggregatedStats(start_time=self.stats.start_time)
        
        # Получаем список файлов статистики
        stats_files = list(self.stats_dir.glob("stats_*.json"))
        active_servers: Set[str] = set()
        
        # Обрабатываем каждый файл
        for stats_file in stats_files:
            try:
                # Читаем файл статистики
                async with aiofiles.open(stats_file, 'r') as f:
                    content = await f.read()
                    data = json.loads(content)
                
                # Извлекаем IP из имени файла или используем имя файла
                ip = stats_file.stem.replace('stats_', '')
                
                # Создаем статистику сервера
                server_stats = ServerStats.from_dict(ip, data)
                self.server_stats[ip] = server_stats
                
                # Проверяем активность сервера (обновление в течение последних 30 секунд)
                if time.time() - server_stats.timestamp < 30:
                    active_servers.add(ip)
                
                # Обновляем агрегированную статистику
                self.stats.goods += server_stats.goods
                self.stats.bads += server_stats.bads
                self.stats.errors += server_stats.errors
                self.stats.offline += server_stats.offline
                self.stats.ipblock += server_stats.ipblock
                self.stats.processed += server_stats.processed
                self.stats.rps += server_stats.rps
            except Exception as e:
                logger.error(f"Ошибка при обработке файла {stats_file}: {e}")
        
        # Обновляем количество серверов
        self.stats.servers = len(self.server_stats)
        self.stats.active_servers = len(active_servers)
        
        # Записываем агрегированную статистику
        try:
            async with aiofiles.open(self.output_file, 'w') as f:
                await f.write(json.dumps(self.stats.to_dict()))
        except Exception as e:
            logger.error(f"Ошибка при записи агрегированной статистики: {e}")
    
    async def run(self) -> None:
        """Запуск агрегатора"""
        logger.info(f"🚀 Запуск агрегатора статистики")
        logger.info(f"📁 Директория статистики: {self.stats_dir}")
        logger.info(f"📊 Интервал опроса: {self.config.poll_interval} сек")
        
        try:
            while True:
                await self.collect_stats()
                
                if self.config.verbose:
                    uptime = time.time() - self.stats.start_time
                    logger.info(
                        f"[Stat] G:{self.stats.goods} B:{self.stats.bads} E:{self.stats.errors} "
                        f"Off:{self.stats.offline} Blk:{self.stats.ipblock} | "
                        f"⚡{self.stats.rps:.1f}/s | Uptime {human_time(uptime)} | "
                        f"Servers: {self.stats.active_servers}/{self.stats.servers}"
                    )
                
                await asyncio.sleep(self.config.poll_interval)
        except asyncio.CancelledError:
            logger.info("Агрегатор остановлен")
        except Exception as e:
            logger.error(f"Ошибка в агрегаторе: {e}")

def parse_arguments() -> argparse.Namespace:
    """Парсинг аргументов командной строки"""
    parser = argparse.ArgumentParser(description="Stats Aggregator")
    parser.add_argument("--stats-dir", default=".", help="Директория с файлами статистики")
    parser.add_argument("--output", default="aggregated_stats.json", help="Файл для агрегированной статистики")
    parser.add_argument("--interval", type=int, default=5, help="Интервал опроса в секундах")
    parser.add_argument("--verbose", action="store_true", help="Подробный вывод")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], help="Уровень логирования")
    return parser.parse_args()

async def main() -> None:
    """Основная функция"""
    args = parse_arguments()
    
    # Настройка уровня логирования
    logger.setLevel(getattr(logging, args.log_level))
    
    # Инициализация и запуск агрегатора
    config = AggregatorConfig.from_args(args)
    aggregator = StatsAggregator(config)
    await aggregator.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.warning("🛑 Агрегатор прерван пользователем")
        sys.exit(0)
    except Exception as e:
        logger.critical(f"❌ Критическая ошибка: {e}")
        sys.exit(1)