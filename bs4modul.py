import paramiko

def ssh_connect(ip, username, password, command):
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(ip, username=username, password=password)
        stdin, stdout, stderr = ssh.exec_command(command)
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        if output:
            print(f"Результат выполнения на {ip}:")
            print(output)
        if error:
            print(f"Ошибка на {ip}:")
            print(error)
        ssh.close()
    except Exception as e:
        print(f"Ошибка при выполнении команды на {ip}: {e}")

def parse_credentials_file(filename):
    credentials = []
    with open(filename, 'r') as file:
        for line in file:
            ip, username, password = line.strip().split(';')
            credentials.append((ip, username, password))
    return credentials

def install_bs4(ip, username, password):
    try:
        commands = [
            'cd /root/MNC/Servis',
            'python3 -m venv myenv',
            'source myenv/bin/activate && pip install --upgrade pip',
            'myenv/bin/pip install beautifulsoup4'
        ]
        for command in commands:
            ssh_connect(ip, username, password, command)
    except Exception as e:
        print(f"Ошибка при установке bs4 на {ip}: {e}")

if __name__ == "__main__":
    credentials = parse_credentials_file('credentials.txt')
    for ip, username, password in credentials:
        install_bs4(ip, username, password)
