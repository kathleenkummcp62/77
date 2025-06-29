#!/usr/bin/env python3
"""installmodule.py
=================================
Устанавливает/обновляет Python‑пакеты (**aiohttp**, **aiohttp_socks**, **aiofiles**)
на всех воркерах, перечисленных в `credentials.txt`.

Особенности:
------------
1. **SSH (paramiko)** — пароль или ключ.
2. **Автодетект sudo** — если нет `sudo` или вы root, он не используется.
3. **Нет pip?** — ставим `python3-pip` через `apt`.
4. **PEP 668 / externally‑managed env?** — повторяем pip c `--break-system-packages`.
5. **Параллельное выполнение** — `ThreadPoolExecutor` (до 8 нитей).
6. **CLI‑список пакетов** — можно передать свои: `python3 installmodule.py paramiko requests`.

Формат `credentials.txt` (коммент и пустые строки игнорируются):
```
192.0.2.10;user;pass123
192.0.2.11;ubuntu;/path/to/key
```

Для Windows‑нод скрипт не предназначен (ожидается Linux + apt).
"""

from __future__ import annotations
import sys, shlex, os
from pathlib import Path
import paramiko
import concurrent.futures as cf

DEFAULT_PACKAGES = "aiohttp aiohttp_socks aiofiles"
CREDENTIALS_FILE = Path("credentials.txt")

###############################################################################
# Utils
###############################################################################

def parse_credentials(path: Path):
    creds = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            ip, user, secret = map(str.strip, line.split(";"))
        except ValueError:
            print(f"[WARN] Пропускаю кривую строку → {line}")
            continue
        creds.append((ip, user, secret))
    return creds


def ssh_connect(ip: str, user: str, secret: str):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        if Path(secret).expanduser().is_file():
            key = paramiko.RSAKey.from_private_key_file(Path(secret).expanduser())
            ssh.connect(ip, username=user, pkey=key, timeout=10)
        else:
            ssh.connect(ip, username=user, password=secret, timeout=10)
        return ssh
    except paramiko.AuthenticationException:
        print(f"[!!] [{ip}] Ошибка аутентификации — проверьте логин/пароль/ключ")
    except Exception as e:
        print(f"[!!] [{ip}] Не удалось подключиться: {e}")
    return None


def run(ssh: paramiko.SSHClient, cmd: str, get_pty=False):
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=get_pty)
    out, err = stdout.read().decode(), stderr.read().decode()
    rc = stdout.channel.recv_exit_status()
    return rc, out.strip(), err.strip()


def ensure_pip(ssh, ip, user, secret):
    """Если pip отсутствует — ставим python3-pip через apt."""
    rc, _, _ = run(ssh, "python3 -m pip --version")
    if rc == 0:
        return True  # pip есть
    # пробуем apt
    install_cmd = "apt-get update -qq && apt-get install -y python3-pip"
    prefix = "" if user == "root" else f"echo {shlex.quote(secret)} | sudo -S "
    print(f"[{ip}] > {prefix}{install_cmd}")
    rc, out, err = run(ssh, prefix + install_cmd, get_pty=True)
    if rc != 0:
        print(f"[{ip}] ❌ Не удалось установить pip через apt:\n{err or out}")
        return False
    print(f"[{ip}] ✅ pip установлен")
    return True


def install_packages(host):
    ip, user, secret, packages = host
    print(f"\n===> [{ip}] Подключаемся…")
    ssh = ssh_connect(ip, user, secret)
    if not ssh:
        return

    # sudo detection
    rc, out, _ = run(ssh, "command -v sudo || echo NOSUDO")
    has_sudo = out.strip() != "NOSUDO"
    base_cmd = f"python3 -m pip install -U {packages}"

    def pip_install(cmd_prefix=""):
        cmd = f"{cmd_prefix}{base_cmd}"
        print(f"[{ip}] > {cmd}")
        rc, out, err = run(ssh, cmd, get_pty=bool(cmd_prefix))
        return rc, out, err

    # 1) Убедимся, что pip есть
    if not ensure_pip(ssh, ip, user, secret):
        ssh.close(); return

    # 2) Попытка без sudo / с sudo‑S
    if user == "root" or not has_sudo:
        rc, out, err = pip_install()
    else:
        rc, out, err = pip_install()  # без sudo сначала
        if rc != 0:
            rc, out, err = pip_install(cmd_prefix=f"echo {shlex.quote(secret)} | sudo -S ")

    # 3) Обработка PEP 668 (externally-managed)
    if rc != 0 and "externally managed" in err.lower():
        print(f"[{ip}] ↩︎ Попробуем с --break-system-packages (PEP 668)")
        base_cmd_break = f"python3 -m pip install --break-system-packages -U {packages}"
        if user == "root" or not has_sudo:
            rc, out, err = run(ssh, base_cmd_break)
        else:
            cmd = f"echo {shlex.quote(secret)} | sudo -S {base_cmd_break}"
            print(f"[{ip}] > {cmd}")
            rc, out, err = run(ssh, cmd, get_pty=True)

    # 4) Вывод
    if out:
        print(f"[{ip}] STDOUT:\n{out}")
    if err:
        print(f"[{ip}] STDERR:\n{err}")
    status = "✅" if rc == 0 else f"❌ (код {rc})"
    print(f"[{ip}] {status} Установка завершена")
    ssh.close()

###############################################################################
# Entry
###############################################################################

if __name__ == "__main__":
    pkgs = " ".join(sys.argv[1:]) or DEFAULT_PACKAGES
    if not CREDENTIALS_FILE.exists():
        sys.exit("credentials.txt не найден")
    hosts = parse_credentials(CREDENTIALS_FILE)
    if not hosts:
        sys.exit("credentials.txt пуст или содержит ошибки")

    print(f"Будем ставить: {pkgs}\nВсего хостов: {len(hosts)}")

    with cf.ThreadPoolExecutor(max_workers=min(8, len(hosts))) as pool:
        pool.map(lambda h: install_packages((*h, pkgs)), hosts)
