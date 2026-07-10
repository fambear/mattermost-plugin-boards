# Mattermost Boards Plugin - Краткое резюме проекта

## 📋 Описание проекта

**Mattermost Boards** (ранее Focalboard) - это плагин для Mattermost, предоставляющий функциональность управления досками и задачами, аналогичную Trello, Notion и Asana.

### Основная информация

- **Название:** FamBear Boards (`name` в `plugin.json`)
- **ID плагина:** focalboard
- **Текущая версия:** 9.2.4
- **Минимальная версия Mattermost:** 10.7.0
- **Репозиторий:** https://github.com/fambear/mattermost-plugin-boards
- **Оригинальный репозиторий:** https://github.com/mattermost/mattermost-plugin-boards
- **Лицензия:** См. LICENSE.txt

---

## 🏗️ Архитектура

### Backend (Server)
- **Язык:** Go
- **Версия Go:** Указана в go.mod (1.24.6)
- **Основные компоненты:**
  - API для работы с досками
  - Интеграция с Mattermost Server
  - WebSocket для real-time обновлений
  - Поддержка SQLite3 и PostgreSQL

### Frontend (Webapp)
- **Фреймворк:** React
- **Язык:** TypeScript
- **Сборщик:** Webpack
- **Node версия:** 20.11 (из .nvmrc)
- **Основные библиотеки:**
  - React, React-DOM
  - React-Redux
  - React-Router
  - Draft.js для редактирования

### Структура директорий

```
mattermost-plugin-boards/
├── server/              # Go backend
│   ├── api/            # API endpoints
│   ├── app/            # Бизнес-логика
│   ├── auth/           # Аутентификация
│   ├── boards/         # Работа с досками
│   ├── model/          # Модели данных
│   └── services/       # Сервисы
├── webapp/             # React frontend
│   ├── src/           # Исходный код
│   ├── static/        # Статические файлы
│   └── tests/         # Тесты
├── build/             # Инструменты сборки
├── scripts/           # Вспомогательные скрипты
├── .github/           # GitHub Actions workflows
└── docs/              # Документация
```

---

## 🚀 Процесс разработки

### Установка зависимостей

```bash
# Backend
go mod download

# Frontend
cd webapp
npm ci
```

### Локальная разработка

```bash
# Сборка для разработки (только текущая платформа)
export MM_DEBUG=true
make dist

# Live-reload режим
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
make watch-plugin
```

### Тестирование

```bash
# make ci == make webapp-ci: линт + jest + tsc (только фронтенд)
make ci

# Backend-тесты. В CI НЕ запускаются — только локально
make server-test

# Только frontend
cd webapp && npm run test

# Линтинг
make check-style
```

**Важно:** `make server-ci`, который вызывает GitHub Actions, сводится к `golangci-lint`.
Go-тесты не выполняются ни в одном workflow — запускайте `make server-test` сами.

---

## 📦 Процесс релиза

> ⚠️ Мерж в `main` автоматически деплоит плагин на production-сервер.
> Полное описание и список рисков — в [RELEASE.md](RELEASE.md).

### Автоматический релиз

```bash
# 1. В рабочей ветке обновить версию
vim plugin.json  # "version": "9.2.5"

# 2. Закоммитить и смержить PR в main
git add plugin.json
git commit -m "Bump version to 9.2.5"
```

Дальше `Check-in tests` → `Release Build`: сборка, git-тег `v9.2.5`, GitHub Release
и загрузка плагина на сервер происходят без участия человека.

Если версию не поднять, деплой всё равно произойдёт, но артефакт существующего релиза
будет перезаписан, а тег останется на старом коммите.

### Локальная сборка

```bash
# Linux/macOS
./scripts/build-release.sh

# Windows
.\scripts\build-release.ps1

# Или через Makefile
make dist-linux
```

### Результат сборки

- **Файл:** `dist/boards-{version}.tar.gz`
- **Платформа:** Linux AMD64 (оптимизировано для self-hosted)
- **Размер:** ~48 MB
- **Содержимое:**
  - `boards/server/dist/plugin-linux-amd64` - Backend бинарник (Linux AMD64)
  - `boards/webapp/dist/main.js` - Frontend bundle
  - `boards/plugin.json` - Манифест плагина
  - `boards/assets/` - Статические ресурсы

**Примечание:** Собирается только Linux AMD64, так как Mattermost загружает только один бинарник, соответствующий OS/ARCH сервера. Для self-hosted с одной архитектурой это стандартная практика.

---

## 🔧 Установка на сервер

### Автоматическая установка

```bash
sudo ./scripts/update-plugin-on-server.sh [version]
```

### Ручная установка

```bash
# 1. Скачать релиз
wget https://github.com/fambear/mattermost-plugin-boards/releases/download/v9.2.4/boards-9.2.4.tar.gz

# 2. Установить
cd /opt/mattermost/plugins
tar -xzf boards-9.2.4.tar.gz
chown -R mattermost:mattermost boards

# 3. Перезапустить Mattermost
systemctl restart mattermost
```

### Через веб-интерфейс

1. System Console → Plugins → Plugin Management
2. Upload Plugin
3. Выбрать файл `boards-{version}.tar.gz`
4. Enable плагин

---

## 📚 Документация

### Основные файлы

- **README.md** - Основная документация
- **RELEASE.md** - Полная инструкция по релизам, ограничения и риски
- **QUICKSTART-RELEASE.md** - Быстрый старт
- **docs/RELEASE-WORKFLOW.md** - Детальный разбор workflow
- **docs/AUTO-UPDATE-GUIDE.md** - Автообновление через Mattermost UI
- **docs/INTEGRATIONS.md** - Figma и другие интеграции
- **docs/github-pr-sync-integration.md** - Синхронизация PR с карточками
- **scripts/README.md** - Документация скриптов

### Полезные ссылки

- [Mattermost Plugin Documentation](https://developers.mattermost.com/integrate/plugins/)
- [Mattermost API Reference](https://api.mattermost.com/)
- [React Documentation](https://react.dev/)
- [Go Documentation](https://go.dev/doc/)

---

## 🛠️ Технологический стек

### Backend
- Go 1.24.6
- Mattermost Plugin API
- SQLite3 / PostgreSQL
- WebSocket
- Viper (конфигурация)

### Frontend
- React 18
- TypeScript
- Redux (state management)
- Webpack (bundler)
- Draft.js (rich text editor)
- React Router (routing)

### DevOps
- GitHub Actions (CI/CD)
- Make (build automation)
- golangci-lint (Go linting)
- ESLint (JS/TS linting)

---

## 🎯 Целевые платформы

- **Собираемая платформа:** Linux AMD64
- **Поддерживаемые платформы (при необходимости):**
  - Linux (AMD64, ARM64)
  - macOS (AMD64, ARM64)
  - Windows (AMD64)
- **Mattermost версия:** 10.7.0+
- **Формат плагина:** tar.gz архив

**Примечание:** По умолчанию собирается только Linux AMD64 для оптимизации размера и скорости. Для других платформ можно использовать `make dist` вместо `make dist-linux`.

---

## 📊 Статистика проекта

- **Языки:** Go, TypeScript, JavaScript
- **Компоненты:** Server + Webapp
- **Тесты:** Unit tests для server и webapp
- **CI/CD:** GitHub Actions
- **Релизы:** Автоматические через GitHub Releases

---

## 🤝 Вклад в проект

Этот проект является форком оригинального mattermost-plugin-boards с добавлением:
- Автоматизации релизов через GitHub Actions
- Скриптов для локальной сборки
- Скриптов для автоматического обновления на сервере
- Расширенной документации

---

## 📞 Поддержка

- **Issues:** https://github.com/fambear/mattermost-plugin-boards/issues
- **Оригинальный проект:** https://github.com/mattermost/mattermost-plugin-boards

---

**Последнее обновление:** 2026-07-10

