/**
 * Архириторика — приёмник формы
 *
 * Принимает POST с данными из формы, пишет строку в Google Sheet,
 * отправляет уведомление в Telegram и письмо на email.
 *
 * Настройка Script Properties (Project Settings → Script Properties):
 *   SHEET_ID         — ID Google-таблицы (берётся из URL: /d/{ID}/edit)
 *   SHEET_NAME       — имя листа (по умолчанию «Заявки»)
 *   TG_BOT_TOKEN     — токен бота от @BotFather
 *   TG_CHAT_ID       — chat_id куда слать (свой ID или ID канала)
 *   NOTIFY_EMAIL     — email для уведомлений (например, sergey@…)
 *
 * Деплой: Deploy → New deployment → type «Web app» →
 *         Execute as: Me, Who has access: Anyone → Deploy.
 *         Скопировать /exec URL и вставить в FORM_ENDPOINT на сайте.
 */

const COLUMNS = [
  'Дата',
  'Имя',
  'Фамилия',
  'Компания',
  'Должность',
  'Программа',
  'Запрос',
  'Источник',
  'Телефон',
  'Почта',
  'Канал связи',
  'Страница'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();

    // 1. Sheet
    appendToSheet(data, props);

    // 2. Telegram
    try { sendTelegram(data, props); }
    catch (err) { console.error('Telegram error:', err); }

    // 3. Email
    try { sendEmail(data, props); }
    catch (err) { console.error('Email error:', err); }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('doPost error:', err);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow opening /exec in browser to verify the deployment
function doGet() {
  return ContentService
    .createTextOutput('Архириторика form endpoint is alive')
    .setMimeType(ContentService.MimeType.TEXT);
}

function appendToSheet(d, props) {
  const sheetId = props.getProperty('SHEET_ID');
  const sheetName = props.getProperty('SHEET_NAME') || 'Заявки';
  if (!sheetId) throw new Error('SHEET_ID is not set');

  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(COLUMNS);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  // Ensure header exists in case sheet was created manually
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    d.firstName || '',
    d.lastName  || '',
    d.company   || '',
    d.position  || '',
    d.program   || '',
    d.request   || '',
    d.source    || '',
    d.phone     || '',
    d.email     || '',
    d.channel   || '',
    d.page      || ''
  ]);
}

function sendTelegram(d, props) {
  const token  = props.getProperty('TG_BOT_TOKEN');
  const chatId = props.getProperty('TG_CHAT_ID');
  if (!token || !chatId) return;

  const lines = [
    '🎤 *Новая заявка — Архириторика*',
    '',
    `*${escape_(d.firstName)} ${escape_(d.lastName)}*` +
      (d.position || d.company ? ` — ${escape_(d.position)}${d.position && d.company ? ', ' : ''}${escape_(d.company)}` : ''),
    '',
    d.program ? `📋 Программа: *${escape_(d.program)}*` : '',
    d.request ? `📝 Запрос: ${escape_(d.request)}` : '',
    d.source  ? `🔍 Узнал: ${escape_(d.source)}`   : '',
    '',
    `📞 ${escape_(d.phone)}`,
    `✉️ ${escape_(d.email)}`,
    `💬 Канал: ${escape_(d.channel)}`
  ].filter(Boolean).join('\n');

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: lines,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    }),
    muteHttpExceptions: true
  });
}

function sendEmail(d, props) {
  const to = props.getProperty('NOTIFY_EMAIL');
  if (!to) return;

  const subject = `Заявка с сайта — ${d.firstName || ''} ${d.lastName || ''}`.trim();
  const body = [
    `Имя: ${d.firstName} ${d.lastName}`,
    `Компания: ${d.company || '—'}`,
    `Должность: ${d.position || '—'}`,
    `Программа: ${d.program || '—'}`,
    '',
    `Запрос: ${d.request || '—'}`,
    `Источник: ${d.source || '—'}`,
    '',
    `Телефон: ${d.phone}`,
    `Почта: ${d.email}`,
    `Канал связи: ${d.channel}`,
    '',
    `Страница: ${d.page}`,
    `Время: ${new Date().toLocaleString('ru-RU')}`
  ].join('\n');

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
    replyTo: d.email || undefined
  });
}

function escape_(s) {
  if (!s) return '';
  // Markdown escaping for Telegram
  return String(s).replace(/([_*`\[\]()])/g, '\\$1');
}

/* --- Test helper. Run from the Apps Script editor to verify wiring. --- */
function testRun() {
  doPost({
    postData: {
      contents: JSON.stringify({
        firstName: 'Тест',
        lastName: 'Тестов',
        company: 'Бюро Альфа',
        position: 'Партнёр',
        program: 'Группа',
        request: 'Готовлюсь к АРХМОСКВА, нужна структура доклада',
        source: 'Telegram-канал',
        phone: '+7 999 000 00 00',
        email: 'test@example.com',
        channel: 'Telegram',
        page: 'https://archiritorica.space/'
      })
    }
  });
}
