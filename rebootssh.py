import paramiko

def reset_server(ip, username, password):
    try:
        
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh_client.connect(ip, username=username, password=password)

        
        commands = [
            'sudo apt-get update',
            'sudo apt-get purge -y python3 python3-pip python3-venv',  
            'sudo apt-get autoremove -y',  
            'sudo apt-get install -y python3 python3-pip python3-venv',  
            'sudo reboot'  
        ]
        for command in commands:
            stdin, stdout, stderr = ssh_client.exec_command(command)
            
            print(stdout.read().decode('utf-8'))
            
            err = stderr.read().decode('utf-8')
            if err:
                print(f"Ошибка на сервере {ip}: {err}")
                break

        print(f"Полный сброс выполнен на сервере {ip}")
    except Exception as e:
        print(f"Ошибка при выполнении сброса на сервере {ip}: {e}")
    finally:
        ssh_client.close()

def process_servers_from_file(file_path):
    with open(file_path, "r") as file:
        for line in file:
            parts = line.strip().split(";")
            if len(parts) == 3:
                ip, username, password = parts
                reset_server(ip, username, password)
            else:
                print(f"Ошибка в формате строки: {line}")


servers_file_path = "credentials.txt"

process_servers_from_file(servers_file_path)
