import subprocess
import os
import tkinter as tk

def run_fortinet_vpn():
    subprocess.Popen(["python", os.path.join("brutstart", "fortistart.py")])

def run_global_protect_vpn():
    subprocess.Popen(["python", os.path.join("brutstart", "globalstart.py")])

def run_citrix_vpn():
    subprocess.Popen(["python", os.path.join("brutstart", "citrixstart.py")])

def run_cisco_vpn():
    subprocess.Popen(["python", os.path.join("brutstart", "ciscostart.py")])

def on_button_hover_enter(event):
    event.widget.config(bg="#ff9999")

def on_button_hover_leave(event):
    event.widget.config(bg="dark grey")

if __name__ == "__main__":
    root = tk.Tk()
    root.title("VPN")
    root.geometry("400x250")
    root.configure(bg="black")

    # Добавляем иконку на панель окна
    icon_path = os.path.join(os.path.dirname(__file__), "terminal_icon.gif")
    if os.path.exists(icon_path):
        icon = tk.PhotoImage(file=icon_path)
        root.iconphoto(True, icon)

    buttons_frame = tk.Frame(root, bg="black")
    buttons_frame.pack(pady=(30, 10))

    button_texts = ["FORTINET VPN", "GLOBAL - PROTECT VPN", "CITRIX VPN", "CISCO VPN"]

    for i, text in enumerate(button_texts, start=1):
        button = tk.Button(buttons_frame, text=text, width=40, height=2, bg="dark grey")
        button.grid(row=i, column=0, padx=10, pady=5)
        if i == 1:
            button.config(command=run_fortinet_vpn)
        elif i == 2:
            button.config(command=run_global_protect_vpn)
        elif i == 3:
            button.config(command=run_citrix_vpn)
        elif i == 4:
            button.config(command=run_cisco_vpn)
        button.bind("<Enter>", on_button_hover_enter)
        button.bind("<Leave>", on_button_hover_leave)

    root.mainloop()
