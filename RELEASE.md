# Инструкция по созданию релиза

## ⚠️ Главное, что нужно знать

**Любой мерж в ветку `main` автоматически деплоит плагин на production-сервер Mattermost.**

Отдельной «релизной» ветки нет, ручного подтверждения нет. Как только «Check-in tests» проходят на `main`, запускается «Release Build», который собирает плагин, публикует его в GitHub Releases и загружает на сервер из секрета `MM_URL`.

Прежде чем нажимать Merge, прочитайте раздел «Ограничения и риски» ниже.

---

## 🔄 Как это работает

```text
push / merge в main
        │
        ▼
┌───────────────────────┐
│  Check-in tests       │  .github/workflows/ci.yml
│  (webapp-ci,          │
│   server-ci = линт)   │
└───────────┬───────────┘
            │ conclusion == success
            ▼
┌───────────────────────┐
│  Release Build        │  .github/workflows/release.yml
│                       │  триггер: workflow_run
│  job: build-and-release│
└───────────┬───────────┘
            │
            ├─ читает version из plugin.json
            ├─ make dist-linux  →  dist/boards-{version}.tar.gz
            │
            ├─ релиз v{version} НЕ существует:
            │     создаёт git-тег → создаёт GitHub Release → заливает артефакт
            │
            └─ релиз v{version} УЖЕ существует:
                  удаляет старый артефакт → заливает новый (--clobber)
                  тег остаётся на прежнем коммите  ⚠️
            │
            ▼
┌───────────────────────┐
│  job: deploy-to-      │  needs: build-and-release
│       mattermost      │
└───────────┬───────────┘
            │
            ├─ скачивает артефакт из релиза v{version} (до 5 попыток)
            ├─ POST /api/v4/plugins/{id}/disable   (continue-on-error)
            ├─ POST /api/v4/plugins   (force=true)
            └─ POST /api/v4/plugins/{id}/enable
```

Второй способ запуска — `workflow_dispatch` (Actions → Release Build → Run workflow). Он собирает и деплоит **ту ветку, из которой запущен**, включая деплой на прод.

---

## 🚀 Как выпустить новую версию

Единственный источник истины для версии — поле `version` в [`plugin.json`](plugin.json).

1. **В рабочей ветке поднимите версию в `plugin.json`:**
   ```bash
   # было "version": "9.2.4"  →  стало "version": "9.2.5"
   make show-version   # проверить текущую
   ```

2. **Закоммитьте вместе с остальными изменениями и откройте PR:**
   ```bash
   git add plugin.json
   git commit -m "Bump version to 9.2.5"
   ```

3. **Смержите PR в `main`.** Дальше всё произойдёт само:
   - «Check-in tests» прогонят линт и webapp-тесты;
   - «Release Build» соберёт `boards-9.2.5.tar.gz`, создаст тег `v9.2.5` и релиз;
   - плагин будет загружен и включён на сервере.

4. **Проверьте результат:**
   - GitHub → Actions → Release Build → Summary;
   - GitHub → Releases → `v9.2.5`;
   - System Console → Plugins → Plugin Management → версия и статус «Active».

### Если версию не поднять

Мерж всё равно уедет на прод, но:
- новый тег **не создастся**;
- артефакт в уже существующем релизе будет **перезаписан** новой сборкой;
- тег продолжит указывать на старый коммит.

Это рабочий, но опасный режим — см. ниже.

---

## Ограничения и риски

Список актуален на момент написания. Это не «планы», а то, как пайплайн ведёт себя сегодня.

### 1. Деплой на прод без подтверждения

У джоба `deploy-to-mattermost` нет `environment:`, а значит нет required reviewers и защиты секретов. Любой мерж в `main` — это деплой. `workflow_dispatch` можно запустить с любой ветки и получить тот же эффект.

### 2. Тег не соответствует содержимому релиза

Если версия в `plugin.json` уже выпущена, workflow удаляет старый артефакт и заливает новый на то же место, не трогая тег. В результате `boards-{version}.tar.gz` может быть собран из коммита, которого нет в теге `v{version}`.

Так уже происходило: тег `v9.2.4` указывает на коммит от 10 марта 2026, а артефакт в этом релизе — сборка от 13 марта, перезаписанная шесть раз подряд.

Следствия:
- **сборку нельзя воспроизвести по тегу;**
- **откатиться на предыдущий артефакт той же версии нельзя** — он затёрт;
- в System Console версия не меняется, хотя код меняется.

### 3. Auto-update через Mattermost UI не увидит изменений

Mattermost сравнивает версии семантически. Если `version` не растёт, «Check for updates» не покажет обновление, даже когда артефакт в релизе уже другой. Автообновление работает только при честном бампе версии.

### 4. Серверные Go-тесты не запускаются в CI

`make server-ci` сводится к `server-lint`, то есть к `golangci-lint`. Тесты из `server/...` не гоняются ни в «Check-in tests», ни где-либо ещё. Запускать их нужно локально:

```bash
make server-test
```

Webapp тестируется полноценно: `make webapp-ci` = eslint + jest + `tsc`.

### 5. Нет защиты от параллельных деплоев

В `release.yml` не задана `concurrency`-группа. Два быстрых мержа подряд могут запустить два перекрывающихся цикла disable → upload → enable на одном сервере.

### 6. Неудачная загрузка оставляет плагин выключенным

Шаг `disable` помечен `continue-on-error: true`, а `upload` — нет. Если загрузка упадёт, джоб завершится с ошибкой уже **после** отключения плагина, и `enable` не выполнится. Boards останется выключенным до ручного вмешательства.

### 7. В бандле только один бинарник

Сборка идёт через `make dist-linux`, то есть в архив попадает только `plugin-linux-amd64`. При этом `plugin.json` объявляет пять исполняемых файлов (linux amd64/arm64, darwin amd64/arm64, windows amd64). На `linux/amd64` это безвредно — Mattermost берёт бинарник под свою платформу и игнорирует остальные. На сервере другой архитектуры плагин не поднимется.

Чтобы собрать все платформы, используйте `make dist` вместо `make dist-linux`.

---

## 📦 Что собирается

- **Платформа:** Linux AMD64
- **Файл:** `boards-{version}.tar.gz`
- **Размер:** ~48 MB
- **Структура архива:**
  ```text
  boards/
  ├── plugin.json
  ├── assets/
  ├── public/
  ├── server/dist/plugin-linux-amd64
  └── webapp/dist/main.js
  ```

---

## 🔐 Секреты GitHub

Деплой использует три секрета репозитория (Settings → Secrets and variables → Actions):

| Секрет | Назначение | Пример |
|---|---|---|
| `MM_URL` | URL сервера Mattermost | `https://mm.fambear.online` |
| `MM_ACCESS_TOKEN` | Personal Access Token с правами `manage_system` | |
| `MM_BOARD_PLUGIN_ID` | ID плагина | `focalboard` |

Как получить токен: войдите системным администратором → Profile → Security → Personal Access Tokens → Create Token.

Если секреты не заданы, шаги деплоя упадут, но релиз к этому моменту уже будет создан.

---

## 🛠️ Локальная сборка

```bash
# Linux/macOS
./scripts/build-release.sh

# Windows
.\scripts\build-release.ps1

# Или напрямую
make dist-linux        # только linux-amd64, ~48 MB
make dist              # все пять платформ, ~150-160 MB
```

Результат — `dist/boards-{version}.tar.gz`.

Перед сборкой полезно прогнать проверки:

```bash
make check-style   # golangci-lint + eslint + stylelint + tsc
make webapp-ci     # линт и jest
make server-test   # Go-тесты (в CI не запускаются!)
```

---

## 🖥️ Ручная установка на сервер

Обычно не нужна — деплой автоматический. Но если требуется поставить конкретную версию:

```bash
# Скриптом
sudo ./scripts/update-plugin-on-server.sh 9.2.4

# Или вручную
wget https://github.com/fambear/mattermost-plugin-boards/releases/download/v9.2.4/boards-9.2.4.tar.gz
cd /opt/mattermost/plugins
sudo tar -xzf /tmp/boards-9.2.4.tar.gz
sudo chown -R mattermost:mattermost boards
sudo systemctl restart mattermost
```

Через веб-интерфейс: System Console → Plugins → Plugin Management → Upload Plugin.

---

## 🐛 Troubleshooting

**Release Build не запустился**

Он триггерится только по успешному завершению «Check-in tests» на ветке `main`. Проверьте, что CI зелёный: GitHub → Actions → Check-in tests.

**Релиз создался, но деплой упал**

Проверьте секреты и доступность `MM_URL` из GitHub Actions. Если джоб упал между `disable` и `enable`, плагин выключен — включите вручную:

```bash
curl -X POST "$MM_URL/api/v4/plugins/focalboard/enable" \
  -H "Authorization: Bearer $MM_ACCESS_TOKEN"
```

**Нужно пересоздать тег**

```bash
git tag -d v9.2.4
git push origin :refs/tags/v9.2.4
```

Учтите, что артефакт в релизе при этом не восстановится.

**Плагин не загружается на сервере**

```bash
journalctl -u mattermost -n 100
ls -la /opt/mattermost/plugins/boards
```

Проверьте, что версия Mattermost не ниже `min_server_version` из `plugin.json` (сейчас 10.7.0).

---

## 📚 Связанные документы

- [QUICKSTART-RELEASE.md](QUICKSTART-RELEASE.md) — короткая шпаргалка
- [docs/RELEASE-WORKFLOW.md](docs/RELEASE-WORKFLOW.md) — детальный разбор workflow
- [docs/AUTO-UPDATE-GUIDE.md](docs/AUTO-UPDATE-GUIDE.md) — автообновление через Mattermost UI
- [scripts/README.md](scripts/README.md) — вспомогательные скрипты
