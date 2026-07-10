# Scripts Directory

Вспомогательные скрипты для сборки и развертывания плагина Mattermost Boards.

## 📋 Список скриптов

### 1. `build-release.sh` (Linux/macOS)
Локальная сборка релиза плагина для Linux AMD64.

**Использование:**
```bash
./scripts/build-release.sh
```

**Требования:**
- Go (версия из go.mod)
- Node.js (версия из .nvmrc)
- npm
- jq
- make

**Результат:**
- Создает файл `dist/boards-{version}.tar.gz`
- Версия берется из `plugin.json`

---

### 2. `build-release.ps1` (Windows)
Аналог `build-release.sh` для Windows PowerShell.

**Использование:**
```powershell
.\scripts\build-release.ps1
```

**Требования:**
- Go
- Node.js
- npm
- PowerShell 5.1+

**Результат:**
- Создает файл `dist\boards-{version}.tar.gz`

---

### 3. `update-plugin-on-server.sh` (Linux Server)
Ручное обновление плагина на сервере Mattermost.

> В обычном потоке этот скрипт не нужен: мерж в `main` деплоит плагин автоматически
> через GitHub Actions. Скрипт полезен для серверов вне контура автодеплоя,
> для отката на конкретную версию или когда деплой-джоб упал.

**Использование:**
```bash
# Установить последнюю версию
sudo ./scripts/update-plugin-on-server.sh

# Установить конкретную версию
sudo ./scripts/update-plugin-on-server.sh 9.2.4
```

**Требования:**
- Запуск от root или с sudo
- curl
- systemctl
- Mattermost установлен в `/opt/mattermost`

**Что делает:**
1. Скачивает релиз с GitHub
2. Создает бэкап текущей версии
3. Останавливает Mattermost
4. Удаляет старую версию плагина
5. Устанавливает новую версию
6. Устанавливает правильные права
7. Запускает Mattermost

**Настройка:**
Если Mattermost установлен в другой директории, отредактируйте переменную:
```bash
MATTERMOST_PATH="/your/custom/path"
```

---

## 🔧 Настройка прав выполнения

После клонирования репозитория, сделайте скрипты исполняемыми:

```bash
chmod +x scripts/*.sh
```

---

## 📝 Примеры использования

### Локальная разработка

```bash
# Собрать релиз локально
./scripts/build-release.sh

# Результат будет в dist/boards-{version}.tar.gz
```

### Развертывание на сервере

```bash
# Скопировать скрипт на сервер
scp scripts/update-plugin-on-server.sh user@server:/tmp/

# Подключиться к серверу
ssh user@server

# Запустить обновление
sudo /tmp/update-plugin-on-server.sh
```

### Автоматизация обновлений

Создайте cron job для автоматической проверки обновлений:

```bash
# Добавьте в crontab (sudo crontab -e)
# Проверять обновления каждый день в 3:00
0 3 * * * /opt/scripts/update-plugin-on-server.sh >> /var/log/boards-update.log 2>&1
```

---

## 🐛 Troubleshooting

### build-release.sh: jq not found
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq
```

### update-plugin-on-server.sh: Permission denied
```bash
# Запустите с sudo
sudo ./scripts/update-plugin-on-server.sh
```

### Mattermost не запускается после обновления
```bash
# Проверьте логи
journalctl -u mattermost -n 50

# Откатитесь к бэкапу
systemctl stop mattermost
rm -rf /opt/mattermost/plugins/boards
mv /opt/mattermost/plugins/boards.backup.* /opt/mattermost/plugins/boards
systemctl start mattermost
```

---

## 📚 Дополнительная информация

- [RELEASE.md](../RELEASE.md) - Полная инструкция по релизам
- [QUICKSTART-RELEASE.md](../QUICKSTART-RELEASE.md) - Быстрый старт
- [README.md](../README.md) - Основная документация

