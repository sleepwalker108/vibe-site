/**
 * Google-форми зі статистикою гарячих ліній для сайту НАРТУ — кожна створюється одним запуском:
 *   • createHotlineForm      — «Звіт роботи гарячих ліній» (адмінка: «Сайт → Статистика гарячих ліній»);
 *   • createAnnualReportForm — «Річний звіт гарячих ліній» (адмінка: «Сайт → Річний звіт гарячих ліній»);
 *   • createTerritoriesForm  — «Мапа: статуси територій» (адмінка: «Сайт → Мапа: статуси територій»).
 *
 * Що робить кожна функція:
 *   • створює Google-форму з усіма питаннями (назви — такі, як рядки в адмінці сайту);
 *   • створює Google-таблицю для відповідей (українські формати дат) і прив'язує її до форми;
 *   • вмикає листи вам на пошту про кожну нову відповідь;
 *   • показує посилання на форму (для працівників). Таблиця лишається ЗАКРИТОЮ (доступ лише у вас).
 *
 * Сайт читає закриті таблиці через цей самий скрипт: він працює від вашого імені й віддає сайту лише
 * відповіді ваших форм — і лише за секретним ключем (функції doGet і siteLinks унизу).
 *
 * Як запустити (5 хвилин):
 *   1. Відкрийте https://script.google.com → «Новий проєкт».
 *   2. Видаліть усе в редакторі й вставте цей файл повністю. Збережіть (значок дискети).
 *   3. Угорі виберіть функцію (createHotlineForm, createAnnualReportForm або createTerritoriesForm) → «Виконати».
 *   4. Google попросить дозволи (створювати форми й таблиці, надсилати вам листи) → «Дозволити».
 *      Якщо з'явиться «Google не перевірив цю програму» → «Додатково» → «Перейти до проєкту». Це ваш власний скрипт.
 *   5. Унизу («Журнал виконання») з'явиться посилання на ФОРМУ — її відкривають працівники й вносять цифри.
 *   Для інших форм повторіть крок 3 з іншою функцією.
 *
 * Підключення до сайту (один раз; таблиці лишаються закритими):
 *   6. Угорі справа «Ввести в дію» (Deploy) → «Нове введення в дію» → значок шестерні → «Веб-застосунок».
 *      «Виконувати як»: Я (ваш акаунт); «Хто має доступ»: Усі (Anyone) → «Ввести в дію» → «Дозволити».
 *      Скопіюйте «URL-адреса веб-застосунку» (закінчується на /exec), вставте її нижче в WEB_APP_URL і збережіть.
 *   7. Виберіть функцію siteLinks → «Виконати». У журналі з'явиться посилання для кожної форми —
 *      вставте його в адмінці сайту у відповідному розділі → блок «Google-форма» → поле посилання → «Зберегти».
 *   Якщо колись зміните скрипт — «Ввести в дію» → «Керувати введеннями в дію» → олівець → «Нова версія» (адреса не зміниться).
 *   Посилання містить секретний ключ — не публікуйте його. Щоб замінити ключ: функція newSiteKey, потім знову siteLinks.
 *   Форми, створені раніше старою версією скрипта, теж підхопляться — siteLinks знайде їх сам.
 *
 * Назви рядків мають збігатися з назвами в адмінці сайту (регістр і лапки не важливі) — точний перелік питань
 * видно в адмінці, у блоці «Google-форма» → «Як налаштувати Google-форму».
 * Змінили рядок в адмінці — змініть і питання у формі (або списки нижче й створіть форму заново).
 */

// Адреса веб-застосунку (крок 6): «Ввести в дію» → «Керувати введеннями в дію» → «URL-адреса веб-застосунку».
// Має закінчуватися на /exec. Вставте між лапками, збережіть і запустіть siteLinks.
const WEB_APP_URL = '';

// ---------- «Звіт роботи гарячих ліній» ----------
const HOTLINE_CATEGORIES = [
  'Виплата державної допомоги ВПО',
  'Грошова допомога від міжнародних організацій',
  'Отримання гуманітарної допомоги',
  'Надання номерів інших установ, організацій, волонтерів',
  'Евакуація',
  'Виплати грошової допомоги сім’ям військовополонених',
  'Компенсація власникам, програма «Прихисток»',
  'Інші питання ВПО',
  'З питань безвісти зниклих осіб',
  'Реєстр оборонців (пошук інформації, внесення доповнень тощо)',
  'Отримання відповідей на звернення / запити',
  'Різні питання',
];

function createHotlineForm() {
  createStatsForm_({
    title: 'Звіт роботи гарячих ліній — для сайту НАРТУ',
    description:
      'Вносьте наростаючі підсумки від початку повномасштабного вторгнення. Лише цифри, без пробілів. ' +
      'Загальну кількість дзвінків («Прийнято») рахувати не треба — сайт додає категорії сам.',
    dates: ['Станом на (дата)'],
    sections: [{ header: 'Категорії звернень', help: 'Кількість звернень за кожною категорією.', prefix: '', rows: HOTLINE_CATEGORIES }],
    numbers: ['Зареєстровано звернень', 'Звернень через месенджери'],
    adminSection: 'Статистика гарячих ліній',
  });
}

// ---------- «Річний звіт гарячих ліній» ----------
// Питання списків — з префіксом («Канали: …», «Топ питань: …», «Вихідні: …»), щоб однакові назви не плутались
const ANNUAL_CHANNELS = ['Гаряча лінія 15-48', 'Гаряча лінія Уповноваженого з питань ВПО', 'Месенджери'];
const ANNUAL_TOP_QUESTIONS = [
  'Грошова допомога ВПО',
  'Консультація щодо Постанови КМУ №332',
  'Контакти установ та організацій',
  'Соціальні виплати',
  'Інші питання',
];
const ANNUAL_OUTGOING = ['Перевірка установ', 'Додаткові консультації', 'Інше'];

function createAnnualReportForm() {
  createStatsForm_({
    title: 'Річний звіт гарячих ліній — для сайту НАРТУ',
    description:
      'Цифри за звітний період. Лише цифри, без пробілів. ' +
      'Загальну кількість, вхідні та вихідні дзвінки рахувати не треба — сайт додає відповідні рядки сам.',
    dates: ['Період: з (дата)', 'Період: по (дата)'],
    sections: [
      { header: 'Вхідні звернення за каналами', help: 'Сума цих рядків = «Вхідні дзвінки».', prefix: 'Канали', rows: ANNUAL_CHANNELS },
      { header: 'Топ питань громадян', help: 'Від найчастішого.', prefix: 'Топ питань', rows: ANNUAL_TOP_QUESTIONS },
      { header: 'Вихідні дзвінки за типами', help: 'Сума цих рядків = «Вихідні дзвінки».', prefix: 'Вихідні', rows: ANNUAL_OUTGOING },
    ],
    numbers: ['Звернень на гарячу лінію 1648', 'Інформаційна SMS-розсилка'],
    adminSection: 'Річний звіт гарячих ліній',
  });
}

// ---------- «Мапа: статуси територій» ----------
// Області — як у списку «Області на мапі» в адмінці. Питання: «Донецька область: Активних бойових дій».
const TERRITORY_STATUSES = ['Можливих бойових дій', 'Активних бойових дій (з е-ресурсами)', 'Активних бойових дій', 'Тимчасово окуповані'];
const TERRITORY_REGIONS = [
  'Чернігівська область',
  'Сумська область',
  'Харківська область',
  'Луганська область',
  'Донецька область',
  'Дніпропетровська область',
  'Запорізька область',
  'Миколаївська область',
  'Херсонська область',
  'Одеська область',
  'Автономна Республіка Крим',
];

function createTerritoriesForm() {
  createStatsForm_({
    title: 'Мапа: статуси територій — для сайту НАРТУ',
    description:
      'Кількість територіальних громад (ТГ) і населених пунктів (НП) за статусами — за чинним переліком територій. ' +
      'Лише цифри, без пробілів; якщо немає — 0. Підсумки сайт рахує сам.',
    dates: [],
    sections: [
      { header: 'Територіальні громади (ТГ)', help: 'Кількість громад за статусами — по всій Україні.', prefix: 'Громади (ТГ)', rows: TERRITORY_STATUSES },
      ...TERRITORY_REGIONS.map((region) => ({
        header: region,
        help: 'Кількість населених пунктів (НП) за статусами.',
        prefix: region,
        rows: TERRITORY_STATUSES,
        page: true, // кожна область — окрема сторінка форми
      })),
    ],
    numbers: [],
    adminSection: 'Мапа: статуси територій',
  });
}

// ---------- спільне ----------
function createStatsForm_(o) {
  const form = FormApp.create(o.title);
  form.setDescription(o.description + ' Після відправлення цифри з’являться в адмінці сайту, а на сайт потраплять після перевірки й публікації.');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(o.sections.some((s) => s.page));
  form.setConfirmationMessage('Дякуємо! Цифри отримано — вони з’являться на сайті після перевірки.');

  const number = () =>
    FormApp.createTextValidation().setHelpText('Введіть ціле число без пробілів, напр. 839620').requireWholeNumber().build();

  o.dates.forEach((t) => form.addDateItem().setTitle(t).setRequired(true));
  o.sections.forEach((s) => {
    if (s.page) form.addPageBreakItem().setTitle(s.header).setHelpText(s.help);
    else form.addSectionHeaderItem().setTitle(s.header).setHelpText(s.help);
    s.rows.forEach((name) =>
      form
        .addTextItem()
        .setTitle(s.prefix ? s.prefix + ': ' + name : name)
        .setValidation(number())
        .setRequired(true)
    );
  });
  if (o.numbers.length) form.addSectionHeaderItem().setTitle('Інше');
  o.numbers.forEach((t) => form.addTextItem().setTitle(t).setValidation(number()).setRequired(true));

  // таблиця відповідей: українські формати (дата 09.10.2026), доступ на перегляд за посиланням
  const ss = SpreadsheetApp.create(o.title.replace(' — для сайту НАРТУ', '') + ' — відповіді (для сайту НАРТУ)');
  ss.setSpreadsheetLocale('uk_UA');
  ss.setSpreadsheetTimeZone('Europe/Kyiv');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  // аркуш з відповідями — першим, порожній аркуш за замовчуванням — прибираємо
  const responses = ss.getSheets().find((s) => s.getFormUrl());
  if (responses) {
    ss.setActiveSheet(responses);
    ss.moveActiveSheet(1);
    ss.getSheets()
      .filter((s) => s.getSheetId() !== responses.getSheetId() && s.getLastRow() === 0)
      .forEach((s) => ss.deleteSheet(s));
  }
  // таблиця лишається закритою: сайт читає її через цей скрипт (doGet) за секретним ключем

  // лист вам на пошту після кожної нової відповіді (за цим тригером скрипт також знаходить свої форми)
  PropertiesService.getScriptProperties().setProperty('admin:' + form.getId(), o.adminSection);
  ScriptApp.newTrigger('notifyNewResponse').forForm(form).onFormSubmit().create();

  Logger.log('ФОРМА для працівників (надішліть їм це посилання):\n' + form.getPublishedUrl());
  Logger.log('Редагувати форму:\n' + form.getEditUrl());
  Logger.log('Таблиця відповідей (закрита, лише для вас):\n' + ss.getUrl());
  Logger.log('Посилання для адмінки сайту — запустіть функцію siteLinks (після кроку 6 з інструкції вгорі).');
}

// Лист власнику скрипта: які цифри надіслали й куди зайти, щоб перенести їх на сайт
function notifyNewResponse(e) {
  const form = e.source;
  const section = PropertiesService.getScriptProperties().getProperty('admin:' + form.getId()) || 'Статистика гарячих ліній';
  const lines = e.response
    .getItemResponses()
    .map((r) => '• ' + r.getItem().getTitle() + ': ' + r.getResponse())
    .join('\n');
  MailApp.sendEmail(
    Session.getEffectiveUser().getEmail(),
    'Нові цифри: ' + form.getTitle(),
    'У формі «' + form.getTitle() + '» нова відповідь:\n\n' +
      lines +
      '\n\nЩоб перенести цифри на сайт: адмінка → «Сайт» → «' + section + '» → блок «Google-форма» → ' +
      '«Перенести в статистику (чернетка)», перевірте й натисніть «Опублікувати».'
  );
}

// ---------- доступ сайту до закритих таблиць ----------
// Секретний ключ (створюється сам при першому запуску siteLinks)
function siteKey_() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('siteKey');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('siteKey', key);
  }
  return key;
}

// Форми, створені цим скриптом (за тригером листів про нові відповіді), — і їхні таблиці
function myForms_() {
  return ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'notifyNewResponse')
    .map((t) => {
      try {
        const form = FormApp.openById(t.getTriggerSourceId());
        return { form: form, sheetId: form.getDestinationId() };
      } catch (e) {
        return null; // форму видалено
      }
    })
    .filter((x) => x && x.sheetId);
}

// Посилання для адмінки сайту — по одному на кожну форму
function siteLinks() {
  // З редактора Google дає тестову адресу …/dev (з іншим ідентифікатором; працює лише для власника) —
  // тому робочу адресу …/exec беремо з WEB_APP_URL угорі файлу
  const service = ScriptApp.getService().getUrl() || '';
  const base = WEB_APP_URL.trim() || (/\/exec$/.test(service) ? service : '');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(base)) {
    Logger.log(
      'Вставте вгорі файлу в WEB_APP_URL адресу веб-застосунку (закінчується на /exec): ' +
        '«Ввести в дію» → «Керувати введеннями в дію» → скопіюйте «URL-адреса веб-застосунку». Збережіть і запустіть siteLinks ще раз.'
    );
    return;
  }
  const key = siteKey_();
  const forms = myForms_();
  if (!forms.length) Logger.log('Форм ще немає — спершу створіть форму (createHotlineForm тощо).');
  forms.forEach((f) => {
    const section = PropertiesService.getScriptProperties().getProperty('admin:' + f.form.getId()) || 'відповідний розділ';
    Logger.log('«' + f.form.getTitle() + '» → адмінка: «' + section + '» → блок «Google-форма»:\n' + base + '?id=' + f.sheetId + '&key=' + key);
  });
}

// Замінити секретний ключ (старі посилання перестануть працювати — вставте нові з siteLinks)
function newSiteKey() {
  PropertiesService.getScriptProperties().deleteProperty('siteKey');
  siteKey_();
  Logger.log('Ключ замінено. Запустіть siteLinks і вставте нові посилання в адмінку сайту.');
}

// Сайт читає відповіді: ?id=<таблиця>&key=<ключ> → CSV аркуша з відповідями.
// Лише таблиці форм цього скрипта і лише з правильним ключем.
function doGet(e) {
  const p = (e && e.parameter) || {};
  const text = (s) => ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);
  const key = PropertiesService.getScriptProperties().getProperty('siteKey');
  if (!key || p.key !== key) return text('ПОМИЛКА: неправильний ключ доступу. Скопіюйте посилання ще раз (функція siteLinks).');
  if (!myForms_().some((f) => f.sheetId === p.id)) return text('ПОМИЛКА: таблицю не знайдено серед форм цього скрипта.');
  const ss = SpreadsheetApp.openById(p.id);
  const sheet = ss.getSheets().find((s) => s.getFormUrl()) || ss.getSheets()[0];
  const csv = sheet
    .getDataRange()
    .getDisplayValues()
    .map((row) => row.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','))
    .join('\n');
  return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
}
