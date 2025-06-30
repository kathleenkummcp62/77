import shutil
import os

# Collect file paths
ip_file_path = 'creds/ip.txt'
login_file_path = 'creds/login.txt'
pass_file_path = 'creds/pass.txt'
loginpass_file_path = 'creds/loginpass.txt'  # New file path for loginpass.txt
gener_file_path = 'gener.txt'

# Read data from files
with open(ip_file_path, 'r') as ip_file:
    ips = ip_file.readlines()

# Read login data from login.txt or loginpass.txt
if os.path.getsize(login_file_path) > 0:
    with open(login_file_path, 'r') as login_file:
        logins = login_file.readlines()
else:
    with open(loginpass_file_path, 'r') as loginpass_file:  # Using loginpass.txt if login.txt is empty
        logins = loginpass_file.readlines()

# Read password data from pass.txt or loginpass.txt
if os.path.getsize(pass_file_path) > 0:
    with open(pass_file_path, 'r') as pass_file:
        passwords = pass_file.readlines()
else:
    with open(loginpass_file_path, 'r') as loginpass_file:  # Using loginpass.txt if pass.txt is empty
        passwords = loginpass_file.readlines()

# If no data found in any of the files, search in the "creds/dictionaries" directory
if not ips or not logins or not passwords:
    dictionary_dir = 'creds/dictionaries'
    for filename in os.listdir(dictionary_dir):
        filepath = os.path.join(dictionary_dir, filename)
        if os.path.isfile(filepath):
            with open(filepath, 'r') as file:
                data = file.readlines()
                if not ips and 'ip' in filename:
                    ips = data
                elif not logins and 'login' in filename:
                    logins = data
                elif not passwords and 'pass' in filename:
                    passwords = data

# Form unique strings from combinations of data
unique_credentials = set()
for ip in ips:
    ip = ip.strip()
    for login in logins:
        login = login.strip()
        for password in passwords:
            password = password.strip()
            credential = f"{ip};{login};{password}"
            unique_credentials.add(credential)

# Write unique strings to gener.txt file
with open(gener_file_path, 'w') as gener_file:
    for credential in unique_credentials:
        gener_file.write(credential + '\n')

print("Generation completed. Unique strings are written to gener.txt.")

# Copy gener.txt to the Generated folder
shutil.copy(gener_file_path, 'Generated/gener.txt')

print("Generation completed. Unique strings are written to gener.txt and copied to the Generated folder.")