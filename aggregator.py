#!/usr/bin/env python3
"""Собирает статистику со всех воркеров каждые 5 секунд."""

from __future__ import annotations
import json, time, sys, paramiko
from pathlib import Path

CRED_FILE   = Path('credentials.txt')
REMOTE_DIR  = '/root/NAM/Servis'
POLL_SECS   = 5

def creds():
    for line in CRED_FILE.read_text().splitlines():
        line=line.strip()
        if not line or line.startswith('#'): continue
        yield tuple(map(str.strip, line.split(';')))

def ssh_client(ip,user,secret):
    cli=paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    if Path(secret).expanduser().is_file():
        cli.connect(ip,username=user,
                    pkey=paramiko.RSAKey.from_private_key_file(Path(secret).expanduser()),
                    timeout=10)
    else:
        cli.connect(ip,username=user,password=secret,timeout=10)
    return cli

def collect(ip,user,secret):
    data=[]
    try:
        cli=ssh_client(ip,user,secret)
        with cli.open_sftp() as sftp:
            for fname in sftp.listdir(REMOTE_DIR):
                if fname.startswith('stats_') and fname.endswith('.json'):
                    try:
                        with sftp.open(f"{REMOTE_DIR}/{fname}") as fd:
                            data.append(json.loads(fd.read().decode()))
                    except Exception:
                        pass
        cli.close()
    except Exception as e:
        print(f"[!!] {ip}: {e}")
    return data

def human(sec):
    m,s=divmod(int(sec),60)
    h,m=divmod(m,60)
    return f"{h:02}:{m:02}:{s:02}"

def main():
    hosts=list(creds())
    start=time.time()
    last_len=0

    # оцениваем общее число строк
    total_lines=0
    for i in range(1,len(hosts)+1):
        f=Path('Generated')/f'part_{i}.txt'
        if f.exists():
            total_lines+=sum(1 for _ in f.open())
    if not total_lines:
        total_lines=1

    while True:
        stats_all=[]
        for ip,user,secret in hosts:
            stats_all+=collect(ip,user,secret)

        tot=lambda k: sum(s.get(k,0) for s in stats_all)
        processed=tot('processed')
        percent=processed/total_lines*100
        speed=processed/(time.time()-start+1e-3)

        line=(f"\r[Stat] G:{tot('goods')} B:{tot('bads')} E:{tot('errors')} "
              f"Off:{tot('offline')} Blk:{tot('ipblock')} | \x1b[92m{processed}/{total_lines}\x1b[0m {percent:6.2f}% | "
              f"S:{speed:6.1f}/s | Uptime {human(time.time()-start)}")

        sys.stdout.write('\r'+' '*last_len+'\r')
        sys.stdout.write(line)
        sys.stdout.flush()
        last_len=len(line)
        time.sleep(POLL_SECS)

if __name__=='__main__':
    main()
