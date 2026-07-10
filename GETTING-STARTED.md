# Getting Started - Первые шаги

## 🎯 Цель этого руководства

Это руководство поможет вам быстро начать работу с проектом Mattermost Boards Plugin, от клонирования репозитория до создания первого релиза.

---

## 📋 Предварительные требования

### Для разработки

- **Go:** 1.24.6+ (проверьте: `go version`)
- **Node.js:** 20.11+ (проверьте: `node --version`)
- **npm:** 10+ (проверьте: `npm --version`)
- **Git:** Любая современная версия
- **Make:** Для запуска команд сборки

### Для создания релизов

- **jq:** Для работы со скриптами (Linux/macOS)
- **GitHub Account:** Для создания релизов

### Для установки на сервер

- **Linux сервер** с установленным Mattermost
- **sudo/root доступ** для установки плагина

---

## 🚀 Шаг 1: Клонирование и настройка

```bash
# Клонировать репозиторий
git clone https://github.com/fambear/mattermost-plugin-boards.git
cd mattermost-plugin-boards

# Установить зависимости
cd webapp
npm ci
cd ..

# Создать .env файл (опционально)
cp .env.example .env
```

---

## 🔨 Шаг 2: Первая сборка

### Локальная сборка для тестирования

```bash
# Установить переменную для быстрой сборки
export MM_DEBUG=true

# Собрать плагин
make dist-linux

# Проверить результат
ls -lh dist/boards-*.tar.gz
```

### Проверка версии

```bash
# Показать текущую версию
make show-version

# Или вручную
cat plugin.json | grep version
```

---

## ✅ Шаг 3: Запуск тестов

```bash
# make ci == make webapp-ci: линт + jest + tsc. Только фронтенд!
make ci

# Backend тесты. В GitHub Actions они НЕ запускаются —
# make server-ci сводится к golangci-lint. Гоняйте локально.
make server-test

# Frontend тесты
cd webapp && npm run test

# Линтинг обеих частей
make check-style
```

---

## 📦 Шаг 4: Создание первого релиза

> ⚠️ Мерж в `main` автоматически деплоит плагин на production-сервер.
> Прочитайте [RELEASE.md](RELEASE.md) прежде чем мержить.

### Вариант A: Автоматический релиз

```bash
# 1. В рабочей ветке обновить версию в plugin.json
vim plugin.json
# Измените: "version": "9.2.5"

# 2. Закоммитить изменения
git add plugin.json
git commit -m "Bump version to 9.2.5"
git push origin HEAD

# 3. Открыть PR и смержить в main.
#    Check-in tests → Release Build → тег, релиз и деплой произойдут сами.

# 4. Следить за прогрессом
# https://github.com/fambear/mattermost-plugin-boards/actions
```

### Вариант B: Локальная сборка

```bash
# Linux/macOS
./scripts/build-release.sh

# Windows
.\scripts\build-release.ps1

# Результат будет в dist/boards-{version}.tar.gz
```

---

## 🖥️ Шаг 5: Установка на сервер

### Вариант A: Автоматическая установка

```bash
# Скопировать скрипт на сервер
scp scripts/update-plugin-on-server.sh user@server:/tmp/

# Подключиться к серверу
ssh user@server

# Запустить установку
sudo /tmp/update-plugin-on-server.sh 9.2.4
```

### Вариант B: Ручная установка

```bash
# На сервере
cd /tmp
wget https://github.com/fambear/mattermost-plugin-boards/releases/download/v9.2.4/boards-9.2.4.tar.gz

# Установить
cd /opt/mattermost/plugins
sudo tar -xzf /tmp/boards-9.2.4.tar.gz
sudo chown -R mattermost:mattermost boards

# Перезапустить Mattermost
sudo systemctl restart mattermost
```

### Вариант C: Через веб-интерфейс

1. Откройте Mattermost
2. System Console → Plugins → Plugin Management
3. Нажмите "Upload Plugin"
4. Выберите файл `boards-9.2.4.tar.gz`
5. Нажмите "Upload"
6. Enable плагин

---

## ✨ Шаг 6: Проверка установки

### На сервере

```bash
# Проверить что плагин установлен
ls -la /opt/mattermost/plugins/boards

# Проверить логи
tail -f /opt/mattermost/logs/mattermost.log

# Проверить статус Mattermost
systemctl status mattermost
```

### В веб-интерфейсе

1. Откройте Mattermost в браузере
2. System Console → Plugins → Plugin Management
3. Найдите "Mattermost Boards"
4. Проверьте что:
   - Версия соответствует установленной
   - Статус: "Active"
   - Нет ошибок

5. Откройте главное меню (≡) → Boards
6. Проверьте что доски открываются

---

## 🎓 Следующие шаги

### Для разработчиков

1. Прочитайте [README.md](README.md) для детальной информации
2. Изучите структуру кода в `server/` и `webapp/`
3. Настройте live-reload: `make watch-plugin`
4. Изучите API в `server/api/`

### Для администраторов

1. Настройте автоматические обновления (cron job)
2. Создайте бэкап-стратегию
3. Настройте мониторинг плагина
4. Изучите [docs/RELEASE-WORKFLOW.md](docs/RELEASE-WORKFLOW.md)

### Для всех

1. Прочитайте [QUICKSTART-RELEASE.md](QUICKSTART-RELEASE.md)
2. Изучите доступные скрипты в [scripts/README.md](scripts/README.md)
3. Посмотрите диаграмму процесса релиза в [docs/RELEASE-WORKFLOW.md](docs/RELEASE-WORKFLOW.md)

---

## 🐛 Troubleshooting

### Проблема: Сборка падает

```bash
# Проверить зависимости
go version
node --version
npm --version

# Переустановить зависимости
cd webapp
rm -rf node_modules
npm ci
cd ..

# Очистить кэш
make clean
```

### Проблема: Тесты не проходят

```bash
# Проверить что все зависимости установлены
go mod download
cd webapp && npm ci

# Запустить тесты с подробным выводом
make server-test
cd webapp && npm run test -- --verbose
```

### Проблема: Плагин не работает на сервере

```bash
# Проверить логи
journalctl -u mattermost -n 100

# Проверить права
ls -la /opt/mattermost/plugins/boards
sudo chown -R mattermost:mattermost /opt/mattermost/plugins/boards

# Проверить версию Mattermost
# Должна быть >= 10.7.0
```

---

## 📚 Полезные команды

```bash
# Показать версию
make show-version

# Собрать для Linux
make dist-linux

# Запустить тесты фронтенда
make ci

# Запустить тесты бэкенда (в CI не гоняются)
make server-test

# Запустить линтинг
make check-style

# Очистить сборку
make clean

# Показать справку
make help
```

---

## 🎉 Готово!

Теперь вы готовы к работе с проектом Mattermost Boards Plugin!

### Быстрые ссылки

- 📖 [Основная документация](README.md)
- 🚀 [Процесс релиза](RELEASE.md)
- ⚡ [Быстрый старт релиза](QUICKSTART-RELEASE.md)
- 🔧 [Документация скриптов](scripts/README.md)
- 📊 [Резюме проекта](PROJECT-SUMMARY.md)

### Нужна помощь?

- Создайте issue: https://github.com/fambear/mattermost-plugin-boards/issues
- Посмотрите оригинальную документацию: https://github.com/mattermost/mattermost-plugin-boards

---

**Удачи в разработке! 🚀**

