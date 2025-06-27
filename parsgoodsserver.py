import os
import paramiko
import random
import string

def parse_credentials_file(filename):
    credentials = []
    with open(filename, 'r') as file:
        for line in file:
            ip, login, password = line.strip().split(';')
            credentials.append((ip, login, password))
    return credentials

def random_string(length=5):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def process_files(ip, login, password):
    ssh_client = paramiko.SSHClient()
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh_client.connect(ip, username=login, password=password)

        sftp = ssh_client.open_sftp()
        sftp.chdir('/root/MNC/Servis/')

        files = sftp.listdir()
        valid_files = [file for file in files if file.startswith('valid') and file.endswith('.txt')]

        valid_dir = 'Valid'
        if not os.path.exists(valid_dir):
            os.makedirs(valid_dir)

        for valid_file in valid_files:
            with sftp.open(valid_file, 'r') as file:
                content = file.read()
                content = content.decode('utf-8')  

                random_suffix = random_string()

                
                local_path = os.path.join(valid_dir, f'{ip}_{valid_file}_{random_suffix}.txt')
                with open(local_path, 'w', encoding='utf-8') as valid_file_local:
                    valid_file_local.write(content)

                
                sftp.remove(valid_file)

        
        bad_files = [file for file in files if 'bad' in file]
        for bad_file in bad_files:
            sftp.remove(bad_file)

    except Exception as e:
        print(f"Error connecting or executing command on {ip}: {str(e)}")
    finally:
        ssh_client.close()


credentials = parse_credentials_file('credentials.txt')

for ip, login, password in credentials:
    process_files(ip, login, password)
