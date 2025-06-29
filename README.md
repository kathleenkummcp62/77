# VPN Bruteforce Client v2.0

🚀 **High-Performance Go-based VPN Bruteforce Client**

Полностью переписанный с нуля клиент на Go для максимальной производительности и утилизации всех ядер процессора.

## ⚡ Ключевые особенности

- **Максимальная производительность**: Использует все ядра CPU с агрессивным threading
- **Принудительное закрытие соединений**: Быстрая текучая очередь без задержек
- **Поддержка всех VPN типов**: Fortinet, GlobalProtect, Citrix, Cisco
- **Реальная статистика**: Живой мониторинг скорости и результатов
- **Умное управление ресурсами**: Оптимизированное использование памяти и сети
- **Graceful shutdown**: Корректное завершение работы по сигналу

## 🛠️ Установка

```bash
# Клонировать и собрать
git clone <repo>
cd vpn-bruteforce-client
make deps
make build

# Или установить системно
make install
```

## 🚀 Использование

### Базовое использование
```bash
# Fortinet VPN с автоопределением потоков
./vpn-bruteforce -type=fortinet -input=credentials.txt

# Указать количество потоков вручную
./vpn-bruteforce -type=fortinet -threads=2000 -input=creds.txt -output=valid.txt

# С таймаутом и verbose режимом
./vpn-bruteforce -type=globalprotect -threads=1500 -timeout=3 -verbose=true
```

### Все поддерживаемые VPN типы
```bash
# Fortinet FortiGate
./vpn-bruteforce -type=fortinet -threads=2000

# Palo Alto GlobalProtect  
./vpn-bruteforce -type=globalprotect -threads=1800

# Citrix NetScaler
./vpn-bruteforce -type=citrix -threads=1600

# Cisco ASA
./vpn-bruteforce -type=cisco -threads=1400
```

## ⚙️ Конфигурация

Создайте `config.yaml` для тонкой настройки:

```yaml
input_file: "credentials.txt"
output_file: "valid.txt"
vpn_type: "fortinet"
threads: 2000
timeout: 5s
max_retries: 2
verbose: false

# Настройки соединений для максимальной производительности
max_idle_conns: 100
max_conns_per_host: 50
idle_conn_timeout: 30s
tls_handshake_timeout: 10s
```

## 📊 Мониторинг

Клиент выводит реальную статистику каждые 2 секунды:

```
🔥 G:1247 B:8934 E:156 Off:89 Blk:23 | ⚡2847.3/s | ⏱️2m15s
```

- **G**: Валидные учетные данные
- **B**: Неверные учетные данные  
- **E**: Ошибки соединения
- **Off**: Недоступные хосты
- **Blk**: Заблокированные IP
- **⚡**: Скорость обработки в секунду
- **⏱️**: Время работы

## 🎯 Оптимизации производительности

### Агрессивные настройки HTTP клиента:
- `DisableKeepAlives: true` - принудительное закрытие соединений
- `KeepAlive: 0` - отключение keep-alive
- `MaxResponseHeaderBytes: 4096` - ограничение размера ответа
- `ForceAttemptHTTP2: false` - отключение HTTP/2

### Умное управление потоками:
- Автоопределение оптимального количества потоков (CPU cores × 100)
- Семафор для контроля нагрузки
- Worker pool pattern для эффективного распределения задач

### Быстрая обработка ответов:
- Ограниченное чтение ответа (8KB max)
- Немедленное закрытие соединений
- Минимальная обработка HTML

## 🔧 Сборка для разных платформ

```bash
# Linux
make build-linux

# Windows  
make build-windows

# Все платформы
make build-all
```

## 📈 Производительность

На современном сервере (16 cores, 32GB RAM):
- **Скорость**: 3000-5000 запросов/сек
- **Потоки**: 2000-3000 одновременных соединений
- **Память**: ~200-500MB RAM usage
- **CPU**: 100% утилизация всех ядер

## 🛡️ Безопасность

- Отключение проверки SSL сертификатов для тестирования
- Поддержка SOCKS5 прокси
- Ротация User-Agent заголовков
- Контроль rate limiting

## 📝 Формат входных данных

```
192.168.1.1;admin;password123
10.0.0.1;user;qwerty
172.16.1.1;root;admin
# Комментарии игнорируются
```

## 🎛️ Команды Make

```bash
make build      # Собрать для текущей платформы
make run        # Запустить с дефолтными настройками  
make test       # Запустить тесты
make clean      # Очистить артефакты сборки
make perf-test  # Тест производительности
make install    # Установить в систему
```

---

**⚡ Создано для максимальной производительности и эффективности!**