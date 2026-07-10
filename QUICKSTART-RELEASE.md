# Быстрый старт: Создание релиза

> ⚠️ **Мерж в `main` = деплой на production.** Подтверждения не спрашивают.
> Подробности и подводные камни — в [RELEASE.md](RELEASE.md).

## 🚀 Автоматический релиз

### Шаг 1: Поднимите версию в рабочей ветке

```bash
make show-version          # текущая версия
nano plugin.json           # "version": "9.2.5"
```

### Шаг 2: Закоммитьте и смержите PR в main

```bash
git add plugin.json
git commit -m "Bump version to 9.2.5"
git push origin HEAD
# дальше — обычный PR и Merge
```

### Шаг 3: Дождитесь автоматики

1. GitHub → Actions → **Check-in tests** должны пройти.
2. После них сам запустится **Release Build**: соберёт bundle для Linux AMD64 (~48 MB),
   создаст тег `v9.2.5`, опубликует релиз.
3. Тот же workflow загрузит плагин на сервер и включит его.

### Шаг 4: Проверьте

- GitHub → Releases → `v9.2.5` с файлом `boards-9.2.5.tar.gz`
- System Console → Plugins → Plugin Management → версия `9.2.5`, статус «Active»

Скачивать и ставить руками ничего не нужно — деплой уже произошёл.

---

## ⚠️ Если версию не поднять

Деплой всё равно случится, но новый тег не создастся, а артефакт существующего релиза
будет перезаписан. Тег останется указывать на старый коммит, и откатиться будет не на что.

Правило простое: **меняешь код — меняй версию в том же PR.**

---

## 🔧 Локальная сборка

### Linux/macOS
```bash
./scripts/build-release.sh
```

### Windows
```powershell
.\scripts\build-release.ps1
```

### Результат
Файл будет создан в: `dist/boards-{version}.tar.gz`

---

## 📋 Checklist перед мержем в main

- [ ] Версия в `plugin.json` поднята
- [ ] `make webapp-ci` проходит
- [ ] `make server-test` проходит — **в CI Go-тесты не запускаются**
- [ ] `make dist-linux` собирается
- [ ] Готовы к тому, что мерж уедет на прод

---

## ❓ Troubleshooting

### Release Build не запустился
Он стартует только после успешных Check-in tests на ветке `main`.
```bash
# Проверьте статус CI
gh run list --workflow=ci.yml --limit 5
```

### Версия в System Console не изменилась
Значит `plugin.json` не трогали. Код обновился, номер — нет.

### Плагин выключился и не включился обратно
Деплой упал между `disable` и `enable`. Включите вручную:
```bash
curl -X POST "$MM_URL/api/v4/plugins/focalboard/enable" \
  -H "Authorization: Bearer $MM_ACCESS_TOKEN"
```

### Сборка падает локально
```bash
go version
npm --version
cd webapp && npm ci
```

---

## 📚 Дополнительная информация

- Полная инструкция: [RELEASE.md](RELEASE.md)
- Разбор workflow: [docs/RELEASE-WORKFLOW.md](docs/RELEASE-WORKFLOW.md)
- Документация по сборке: [README.md](README.md)
- GitHub Actions workflow: [.github/workflows/release.yml](.github/workflows/release.yml)
