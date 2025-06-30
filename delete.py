import paramiko

def delete_mnc(hostname, username, password):
    try:
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh_client.connect(hostname, username=username, password=password)

        
        ssh_client.exec_command("rm -rf /root/MNC")

        print(f"Папка MNC успешно удалена на {hostname}")
    except Exception as e:
        print(f"Ошибка при удалении папки MNC на {hostname}: {e}")
    finally:
        ssh_client.close()

def process_servers_from_file(file_path):
    with open(file_path, "r") as file:
        for line in file:
            parts = line.strip().split(";")
            if len(parts) == 3:
                hostname, username, password = parts
                delete_mnc(hostname, username, password)
            else:
                print(f"Ошибка в формате строки: {line}")


servers_file_path = "credentials.txt"


process_servers_from_file(servers_file_path)
