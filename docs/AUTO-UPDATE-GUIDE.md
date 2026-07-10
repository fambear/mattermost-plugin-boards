# Руководство по автоматическому обновлению плагина

## 🎯 Обзор

Есть два независимых пути обновления плагина на сервере:

1. **Автодеплой из GitHub Actions** — основной. Срабатывает при каждом мерже в `main`
   и загружает плагин на сервер из секрета `MM_URL`. Ничего нажимать не нужно.
   См. [RELEASE.md](../RELEASE.md).

2. **Автообновление через Mattermost UI** — резервный. Администратор нажимает
   «Check for updates» в System Console, и Mattermost сам скачивает релиз с GitHub.

Этот документ — про второй путь. Он полезен для серверов, которые не входят в контур
автодеплоя (например, второй инстанс или стенд), либо когда деплой-джоб упал.

---

## ✅ Как это работает

### 1. Проверка обновлений

Mattermost смотрит на релизы репозитория, указанного в `release_notes_url` из `plugin.json`:

- **URL:** `https://github.com/fambear/mattermost-plugin-boards/releases`
- **Частота проверки:** настраивается в System Console

### 2. Определение новой версии

Mattermost семантически сравнивает версию установленного плагина с последней в GitHub Releases.
Если версия в GitHub выше — обновление доступно.

### 3. Скачивание и установка

При нажатии «Update» Mattermost скачивает `boards-{version}.tar.gz` из релиза,
распаковывает, заменяет файлы плагина и перезагружает его (hot reload, без рестарта сервера).

---

## ⚠️ Когда автообновление не сработает

**Версия не выросла.** Это главный подводный камень текущего пайплайна.

Если код смержили в `main` без бампа `version` в `plugin.json`, Release Build перезапишет
артефакт внутри уже существующего релиза, оставив номер версии прежним. Mattermost сравнит
`9.2.4` с `9.2.4`, решит, что обновлять нечего, и кнопка «Update» не появится — хотя код
в релизе уже другой.

Вывод: **автообновление работает только тогда, когда версия честно увеличивается.**

---

## 🔧 Настройка

### Шаг 1: Проверьте plugin.json

```json
{
  "id": "focalboard",
  "version": "9.2.4",
  "homepage_url": "https://github.com/fambear/mattermost-plugin-boards",
  "support_url": "https://github.com/fambear/mattermost-plugin-boards/issues",
  "release_notes_url": "https://github.com/fambear/mattermost-plugin-boards/releases"
}
```

`release_notes_url` должен указывать на ваш репозиторий.

### Шаг 2: Включите автоматическую проверку (опционально)

System Console → Plugins → Plugin Management → настройки проверки обновлений.

### Шаг 3: Выпустите релиз

Поднимите версию в `plugin.json` и смержите PR в `main` —
см. [QUICKSTART-RELEASE.md](../QUICKSTART-RELEASE.md).

---

## 📦 Требования к релизу

### Имя файла

`boards-{version}.tar.gz`, например `boards-9.2.4.tar.gz`. Workflow формирует его сам.

### Структура архива

```text
boards/
├── plugin.json
├── assets/
├── public/
├── server/
│   └── dist/
│       └── plugin-linux-amd64
└── webapp/
    └── dist/
        └── main.js
```

### Про платформы

CI собирает через `make dist-linux`, поэтому в архиве **только `plugin-linux-amd64`**.

Mattermost загружает ровно один бинарник — тот, что соответствует OS/ARCH сервера,
остальные игнорирует. Для self-hosted инстанса на `linux/amd64` этого достаточно, и bundle
получается ~48 MB вместо ~150-160 MB.

**Ограничение:** на сервере другой архитектуры (например, `linux/arm64`) плагин из этого
архива не поднимется — нужного бинарника там нет, хотя `plugin.json` объявляет все пять.
Для такого сервера соберите bundle через `make dist`.

---

## 🔍 Проверка работы

### Тест 1: структура релиза

```bash
wget https://github.com/fambear/mattermost-plugin-boards/releases/download/v9.2.4/boards-9.2.4.tar.gz
tar -tzf boards-9.2.4.tar.gz | head -20
```

Ожидаемо увидеть `boards/plugin.json`, `boards/server/dist/plugin-linux-amd64`,
`boards/webapp/dist/main.js`.

### Тест 2: через Mattermost UI

1. Установите текущую версию плагина.
2. Выпустите релиз с **увеличенной** версией.
3. System Console → «Check for updates» → должна появиться кнопка «Update».

Если кнопки нет — сверьте номера версий (см. раздел про подводный камень выше).

---

## ⚠️ Важные замечания

1. **Версия должна увеличиваться.** `9.2.5` > `9.2.4` → обновление доступно.
   `9.2.4` = `9.2.4` → Mattermost считает, что обновлять нечего.

2. **Бинарник нужен под платформу сервера.** Если его нет в архиве, установка не удастся.

3. **GitHub Releases должны быть доступны серверу.** Для приватного репозитория
   потребуется отдельная настройка доступа.

---

## 📚 Дополнительная информация

- [RELEASE.md](../RELEASE.md) — полная инструкция по релизам
- [RELEASE-WORKFLOW.md](RELEASE-WORKFLOW.md) — разбор GitHub Actions
- [QUICKSTART-RELEASE.md](../QUICKSTART-RELEASE.md) — быстрый старт
- [Mattermost Plugin Documentation](https://developers.mattermost.com/integrate/plugins/)
