import time
import pyautogui
import paramiko

def execute_command(ip, login, password, command_number):
    ssh_client = paramiko.SSHClient()
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh_client.connect(ip, username=login, password=password)
        ssh_client.exec_command(f'cd /root/MNC/Servis && python3 sers{command_number}.py')
        
        
        time.sleep(2)

        
        pyautogui.typewrite(f'python3 sers{command_number}.py')
        pyautogui.press('enter')
        
        print(f'Команда sers{command_number}.py выполнена на {ip}.')
        
    except Exception as e:
        print(f"Ошибка при подключении или выполнении команды на {ip}: {str(e)}")
    finally:
        ssh_client.close()
