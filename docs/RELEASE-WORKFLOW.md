# Release Workflow: детальный разбор

Этот документ описывает, что именно происходит в GitHub Actions при мерже в `main`.
Практическая инструкция «как выпустить версию» — в [RELEASE.md](../RELEASE.md).

## Полная цепочка

```text
┌──────────────────────────────────────────────────────────────────┐
│  1. Разработчик мержит PR в main                                 │
│     (при необходимости — с бампом version в plugin.json)         │
└───────────────────────────┬──────────────────────────────────────┘
                            │  push: main
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. Check-in tests            .github/workflows/ci.yml           │
│                                                                  │
│     make webapp-ci   →  eslint + stylelint + jest + tsc          │
│     make server-ci   →  golangci-lint                            │
│                         (Go-тесты НЕ запускаются)                │
└───────────────────────────┬──────────────────────────────────────┘
                            │  workflow_run: conclusion == success
                            │  branches: [main]
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. Release Build             .github/workflows/release.yml      │
│     job: build-and-release    runs-on: ubuntu-22.04              │
│                                                                  │
│     ├─ VERSION=$(jq -r '.version' plugin.json)                   │
│     ├─ setup-go (go.mod) + setup-node (.nvmrc)                   │
│     ├─ cd webapp && npm ci                                       │
│     ├─ make dist-linux  →  dist/boards-$VERSION.tar.gz           │
│     │                                                            │
│     └─ gh release view v$VERSION                                 │
│           ├─ не найден  →  git tag -a v$VERSION                  │
│           │                gh release create + upload артефакта  │
│           │                                                      │
│           └─ найден     →  gh release delete-asset               │
│                            gh release upload --clobber           │
│                            ⚠️ тег остаётся на прежнем коммите     │
└───────────────────────────┬──────────────────────────────────────┘
                            │  needs: build-and-release
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. Release Build                                                │
│     job: deploy-to-mattermost                                    │
│                                                                  │
│     ├─ gh release download v$VERSION      (до 5 попыток, пауза 5с)│
│     ├─ POST $MM_URL/api/v4/plugins/$ID/disable                   │
│     │       continue-on-error: true                              │
│     ├─ POST $MM_URL/api/v4/plugins   (force=true)                │
│     │       ⚠️ если упадёт — enable не выполнится                 │
│     └─ POST $MM_URL/api/v4/plugins/$ID/enable                    │
└──────────────────────────────────────────────────────────────────┘
```

Второй вход в шаг 3 — `workflow_dispatch`. Он не проверяет ветку: Release Build,
запущенный вручную из любой ветки, соберёт её и задеплоит на прод.

---

## Триггеры

| Workflow | Файл | Когда запускается |
|---|---|---|
| Check-in tests | `ci.yml` | push в `main` и `releases-**`, любой PR, вручную |
| Release Build | `release.yml` | успешное завершение Check-in tests на `main`; вручную |
| CodeQL | `codeql-analysis.yml` | push/PR в `main` и `release-**`, еженедельно по расписанию |
| Scorecards | `scorecards-analysis.yml` | push в `main`, еженедельно по расписанию |

Ветки `release` в триггерах нет. Она осталась в репозитории с января 2026 и не используется:
коммит `a5fcd6eb` («release from main branch now») перевёл релиз на `main`, а `de10d9d1`
заменил прямой push-триггер на `workflow_run` после Check-in tests.

---

## Ключевые компоненты

### plugin.json

Единственный источник истины для версии. Используется для имени тега (`v{version}`),
имени артефакта (`boards-{version}.tar.gz`) и отображения в System Console.

```json
{
  "id": "focalboard",
  "version": "9.2.4",
  "min_server_version": "10.7.0"
}
```

Поднимается вручную, отдельным коммитом. Автоматической проверки, что версия выросла, нет.

### Makefile

| Цель | Что делает |
|---|---|
| `make dist-linux` | `apply` + сборка `plugin-linux-amd64` + webapp + bundle |
| `make dist` | то же, но пять бинарников (linux/darwin amd64+arm64, windows amd64) |
| `make show-version` | печатает версию из `plugin.json` |
| `make webapp-ci` | eslint + stylelint + jest + `tsc` |
| `make server-ci` | **только** `golangci-lint` |
| `make server-test` | Go-тесты (в CI не вызывается) |

Цели `make patch` / `minor` / `major` достались от апстрима. Они создают подписанный
git-тег на основе `git describe`, **не изменяя `plugin.json`**. С текущей схемой релизов
они рассинхронизируют тег и манифест — не используйте их.

### Секреты

`MM_URL`, `MM_ACCESS_TOKEN`, `MM_BOARD_PLUGIN_ID` — см. [RELEASE.md](../RELEASE.md).
`GITHUB_TOKEN` предоставляется Actions автоматически; в `build-and-release` задан
`permissions: contents: write` для создания тегов и релизов.

---

## Поведение при повторном запуске с той же версией

Это самый неочевидный участок пайплайна.

Если релиз `v{version}` уже существует, ветка «Update existing release» удаляет старый
артефакт и заливает новый на его место. Git-тег при этом **не двигается**.

Практическое следствие: после нескольких мержей без бампа версии тег `v{version}` указывает
на один коммит, а артефакт в релизе собран из другого. Так произошло с `v9.2.4`: тег стоит
на коммите от 10 марта 2026, артефакт — сборка от 13 марта, перезаписанная шесть раз.

Чтобы каждая сборка была адресуемой и откатываемой, поднимайте версию в `plugin.json`
в том же PR, который меняет код.

---

## Чего в пайплайне нет

Осознанно перечислено, чтобы никто не искал:

- **`environment:` у деплоя** — нет required reviewers, нет защиты секретов.
- **`concurrency`-группы** — параллельные деплои на один сервер не сериализуются.
- **Проверки, что версия не выпущена** — вместо ошибки происходит тихая перезапись.
- **Go-тестов в CI** — `server-ci` сводится к линтеру.
- **Генерации release notes** — текст релиза всегда `Automated release build for version X`.
- **Отката** — предыдущий артефакт той же версии затирается безвозвратно.

---

## Проверка релиза

Перед мержем:

```bash
make show-version
make check-style
make webapp-ci
make server-test     # локально, потому что CI это не делает
make dist-linux
ls -lh dist/boards-*.tar.gz
```

После мержа:

1. GitHub → Actions → Release Build → Summary.
2. GitHub → Releases: тег создан, артефакт приложен.
3. System Console → Plugins → Plugin Management: версия и статус «Active».
4. При проблемах — логи сервера: `journalctl -u mattermost -n 100`.

---

## Troubleshooting

**Release Build не запустился.** Он висит на `workflow_run` от Check-in tests с фильтром
`branches: [main]`. Если CI упал или push был не в `main`, релиз не стартует.

**Артефакт не скачался в deploy-джобе.** Между созданием релиза и доступностью ассета через
API бывает задержка; шаг делает до 5 попыток с паузой 5 секунд (добавлено в `3b433107`).

**Плагин остался выключенным.** Джоб упал между `disable` и `enable`. Включите вручную:

```bash
curl -X POST "$MM_URL/api/v4/plugins/focalboard/enable" \
  -H "Authorization: Bearer $MM_ACCESS_TOKEN"
```

**Версия в System Console не изменилась после мержа.** Ожидаемо, если `plugin.json` не трогали:
код обновился, номер версии — нет.

---

## Дополнительные ресурсы

- [RELEASE.md](../RELEASE.md) — как выпускать версии
- [AUTO-UPDATE-GUIDE.md](AUTO-UPDATE-GUIDE.md) — автообновление через Mattermost UI
- [Mattermost Plugin Documentation](https://developers.mattermost.com/integrate/plugins/)
