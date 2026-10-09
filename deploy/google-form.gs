/**
 * Google-форма «Звіт роботи гарячих ліній» для сайту НАРТУ — створюється одним запуском.
 *
 * Що робить скрипт:
 *   • створює Google-форму з усіма питаннями (дата + категорії + «Зареєстровано» + «Через месенджери»);
 *   • створює Google-таблицю для відповідей (українські формати дат і чисел) і прив'язує її до форми;
 *   • відкриває таблицю на перегляд за посиланням — щоб сайт міг її прочитати;
 *   • вмикає листи вам на пошту про кожну нову відповідь;
 *   • показує посилання: на форму (для працівників) і на таблицю (вставити в адмінку сайту).
 *
 * Як запустити (5 хвилин):
 *   1. Відкрийте https://script.google.com → «Новий проєкт».
 *   2. Видаліть усе в редакторі й вставте цей файл повністю. Збережіть (значок дискети).
 *   3. Угорі виберіть функцію «createHotlineForm» → «Виконати».
 *   4. Google попросить дозволи (створювати форми й таблиці, надсилати вам листи) → «Дозволити».
 *      Якщо з'явиться «Google не перевірив цю програму» → «Додатково» → «Перейти до проєкту». Це ваш власний скрипт.
 *   5. Унизу («Журнал виконання») з'являться два посилання:
 *        • ФОРМА — її відкривають працівники й вносять цифри;
 *        • ТАБЛИЦЯ — її вставте в адмінці сайту: «Сайт → Статистика гарячих ліній» → блок «Google-форма» → поле посилання → «Зберегти».
 *
 * Назви категорій мають збігатися з назвами в адмінці сайту (регістр і лапки не важливі).
 * Змінили категорію в адмінці — змініть і питання у формі (або в списку нижче й створіть форму заново).
 */

const CATEGORIES = [
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
  const form = FormApp.create('Звіт роботи гарячих ліній — для сайту НАРТУ');
  form.setDescription(
    'Вносьте наростаючі підсумки від початку повномасштабного вторгнення. Лише цифри, без пробілів. ' +
      'Загальну кількість дзвінків («Прийнято») рахувати не треба — сайт додає категорії сам. ' +
      'Після відправлення цифри з’являться в адмінці сайту, а на сайт потраплять після перевірки й публікації.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(false);
  form.setConfirmationMessage('Дякуємо! Цифри отримано — вони з’являться на сайті після перевірки.');

  const number = () =>
    FormApp.createTextValidation().setHelpText('Введіть ціле число без пробілів, напр. 839620').requireWholeNumber().build();

  form.addDateItem().setTitle('Станом на (дата)').setRequired(true);

  form.addSectionHeaderItem().setTitle('Категорії звернень').setHelpText('Кількість звернень за кожною категорією.');
  CATEGORIES.forEach((name) => form.addTextItem().setTitle(name).setValidation(number()).setRequired(true));

  form.addSectionHeaderItem().setTitle('Інше');
  form.addTextItem().setTitle('Зареєстровано звернень').setValidation(number()).setRequired(true);
  form.addTextItem().setTitle('Звернень через месенджери').setValidation(number()).setRequired(true);

  // таблиця відповідей: українські формати (дата 09.10.2026), доступ на перегляд за посиланням
  const ss = SpreadsheetApp.create('Звіт роботи гарячих ліній — відповіді (для сайту НАРТУ)');
  ss.setSpreadsheetLocale('uk_UA');
  ss.setSpreadsheetTimeZone('Europe/Kyiv');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  // аркуш «Відповіді» — першим, щоб сайт читав саме його
  const responses = ss.getSheets().find((s) => s.getFormUrl());
  if (responses) {
    ss.setActiveSheet(responses);
    ss.moveActiveSheet(1);
    ss.getSheets().filter((s) => s.getSheetId() !== responses.getSheetId() && s.getLastRow() === 0).forEach((s) => ss.deleteSheet(s));
  }
  DriveApp.getFileById(ss.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // лист вам на пошту після кожної нової відповіді
  ScriptApp.newTrigger('notifyNewResponse').forForm(form).onFormSubmit().create();

  const sheetUrl = ss.getUrl() + (responses ? '#gid=' + responses.getSheetId() : '');
  Logger.log('ФОРМА для працівників (надішліть їм це посилання):\n' + form.getPublishedUrl());
  Logger.log('Редагувати форму:\n' + form.getEditUrl());
  Logger.log('ТАБЛИЦЯ — вставте в адмінці сайту («Статистика гарячих ліній» → «Google-форма»):\n' + sheetUrl);
}

// Лист власнику скрипта: які цифри надіслали й куди зайти, щоб перенести їх на сайт
function notifyNewResponse(e) {
  const lines = e.response
    .getItemResponses()
    .map((r) => '• ' + r.getItem().getTitle() + ': ' + r.getResponse())
    .join('\n');
  MailApp.sendEmail(
    Session.getEffectiveUser().getEmail(),
    'Нові цифри для «Звіту роботи гарячих ліній»',
    'У формі нова відповідь:\n\n' +
      lines +
      '\n\nЩоб перенести цифри на сайт: адмінка → «Сайт» → «Статистика гарячих ліній» → блок «Google-форма» → ' +
      '«Перенести в статистику (чернетка)», перевірте й натисніть «Опублікувати».'
  );
}
