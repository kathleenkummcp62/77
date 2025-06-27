import os
import paramiko

def parse_credentials_file(filename):
    credentials = []
    with open(filename, 'r') as file:
        for line in file:
            ip, login, password = line.strip().split(';')
            credentials.append((ip, login, password))
    return credentials

def upload_files_to_server(ip, login, password, local_folder, remote_folder):
    ssh_client = paramiko.SSHClient()
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        # Добавление таймаута к подключению
        ssh_client.connect(ip, username=login, password=password, timeout=10)

        ssh_client.exec_command(f'mkdir -p {remote_folder}')

        sftp = ssh_client.open_sftp()

        for file in os.listdir(local_folder):
            local_path = os.path.join(local_folder, file)
            remote_path = os.path.join(remote_folder, file)

            sftp.put(local_path, remote_path)

        sftp.close()
        print(f"Файлы успешно загружены на сервер {ip}.")
    except FileNotFoundError as e:
        print(f"Файл не найден: {e}")
    except Exception as e:
        print(f"Ошибка при подключении или загрузке файлов на {ip}: {str(e)}")
    finally:
        ssh_client.close()

credentials = parse_credentials_file('credentials.txt')

for ip, login, password in credentials:
    upload_files_to_server(ip, login, password, 'Servis', '/root/NAM/Servis/')
