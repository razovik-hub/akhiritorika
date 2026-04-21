# Подключение формы к Google Sheets + Email

Сайт статический (GitHub Pages), бэкенда нет — поэтому форму обрабатывает Google Apps Script. Настраивается один раз, дальше работает само.

Сейчас бэкенд делает две вещи: **пишет строку в Google Sheet** и **шлёт уведомление на email**. Telegram-уведомления отложены (добавим позже отдельным шагом).

## 1. Google Sheet

1. Создай новую таблицу: https://sheets.new
2. Назови её, например, «Архириторика — Заявки»
3. Скопируй её **ID** из URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`
4. Можно создать лист «Заявки» вручную, либо скрипт создаст автоматически при первой заявке

## 2. Apps Script

1. Открой свою таблицу → меню **Extensions → Apps Script**
2. Удали содержимое `Code.gs`, вставь содержимое файла `apps-script/Code.gs` из этой папки
3. **Project Settings (шестерёнка слева) → Script Properties → Add property:**
   - `SHEET_ID` = ID таблицы из шага 1
   - `SHEET_NAME` = `Заявки` (или другое имя листа)
   - `NOTIFY_EMAIL` = твой email для уведомлений
4. Сохрани (Ctrl/Cmd+S)

## 3. Тест

В редакторе скриптов выбери функцию `testRun` сверху → нажми **Run**.

В первый раз попросит выдать разрешения — соглашайся (предупреждение «Google hasn’t verified this app» → Advanced → Go to … → Allow).

Если всё ок — в таблице появится строка, на email придёт письмо.

## 4. Деплой как Web App

1. Сверху справа: **Deploy → New deployment**
2. Иконка шестерёнки → выбери тип **Web app**
3. Описание: `Archiritorika form v1`
4. **Execute as: Me**
5. **Who has access: Anyone** (без этого сайт не сможет постить)
6. **Deploy** → выдаст URL вида `https://script.google.com/macros/s/AK.../exec`
7. Скопируй этот URL

## 5. Подключение к сайту

В `index.html` найди строку:

```js
const FORM_ENDPOINT = 'https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec';
```

Замени URL на полученный в шаге 4, закоммить и запушь:

```sh
git add index.html && git commit -m "Wire form to Apps Script endpoint" && git push
```

## Проверка живой формы

1. Открой https://archiritorica.space
2. Заполни форму, нажми «Отправить заявку»
3. Должно появиться «Спасибо! Заявка отправлена…»
4. Проверь: строка в таблице + письмо на почте

## Если что-то не работает

- **Форма говорит «не получилось отправить»** — проверь что `FORM_ENDPOINT` подставлен и деплой опубликован с `Anyone` доступом
- **Письмо не приходит** — запусти `testRun` в редакторе, посмотри логи (`View → Logs`). Проверь что `NOTIFY_EMAIL` задан в Script Properties
- **Меняешь Code.gs?** — после изменения нужно сделать **Deploy → Manage deployments → Edit (карандаш) → New version → Deploy**, иначе сайт продолжит обращаться к старой версии

## Обновление формы

Если добавляешь новые поля:
1. Добавить в массив `COLUMNS` в `Code.gs`
2. Добавить в `appendToSheet` соответствующее значение
3. Если нужно — добавить вручную колонку в таблицу
4. Передеплоить новую версию

## Добавить Telegram позже

Когда надумаешь подключать бот — скажи, верну в `Code.gs` функцию `sendTelegram` и добавлю в SETUP шаги: создать бота через `@BotFather`, получить токен, узнать `chat_id` через `@userinfobot`, положить в Script Properties как `TG_BOT_TOKEN` и `TG_CHAT_ID`.
