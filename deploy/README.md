# Сайт НАРТУ на Linux-сервері

Схема роботи:

```
Ваш комп'ютер ──git push──▶ GitHub ──sudo nartu-update──▶ Linux-сервер (сайт працює постійно)
```

## Перше встановлення (один раз)

Команди вводяться в **PowerShell на вашому комп'ютері** (кнопка Пуск → «PowerShell»).
Коли сервер попросить пароль — вводьте його (символи не відображаються, це нормально).

**1. Скопіювати на сервер базу й файли** (архів уже підготовлено в папці `backups`):

```powershell
scp "C:\Users\singaevskyi_max\Documents\dp-reintegration site\backups\nartu-data.tar.gz" user@10.1.9.12:/tmp/nartu-data.tar.gz
```

**2. Зайти на сервер:**

```powershell
ssh user@10.1.9.12
```

**3. Уже на сервері — встановити сайт** (5–10 хвилин):

```bash
curl -fsSL https://raw.githubusercontent.com/sleepwalker108/vibe-site/main/deploy/install.sh -o install.sh && sudo bash install.sh
```

У кінці з'явиться адреса сайту, напр. `http://10.1.9.12`, і адмінки — `http://10.1.9.12/admin`.
Логін і пароль до адмінки — ті самі, що й на вашому комп'ютері.

**4. Змінити пароль сервера** (він потрапив у переписку):

```bash
passwd
```

## Як оновлювати сайт після змін

1. Змінили щось на комп'ютері → відправили на GitHub (`git push`, або скажіть Claude «залий на гітхаб»).
2. На сервері:

```bash
ssh user@10.1.9.12
sudo nartu-update
```

Сайт збирає нову версію **поруч зі старою** (у цей час працює стара), потім за кілька секунд підміняє її.
Якщо щось пішло не так — автоматично повертає попередню версію. Перед кожним оновленням робиться копія бази.

## Корисні команди на сервері

| Що зробити | Команда |
|---|---|
| Оновити сайт з GitHub | `sudo nartu-update` |
| Резервна копія зараз | `sudo nartu-backup` |
| Чи працює сайт | `systemctl status nartu-site` |
| Журнал сайту (вихід — Ctrl+C) | `journalctl -u nartu-site -f` |
| Перезапустити сайт | `sudo systemctl restart nartu-site` |

Резервні копії лежать у `/opt/nartu/backups` (щодня о 03:15 + перед кожним оновленням).

## Домен і HTTPS (потім)

Коли домен (напр. `dp-reintegration.gov.ua`) буде вказувати на цей сервер:

```bash
sudo sed -i 's/server_name _;/server_name dp-reintegration.gov.ua;/' /etc/nginx/sites-available/nartu && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d dp-reintegration.gov.ua
```

і в `/opt/nartu/site/.env` змінити `NEXT_PUBLIC_SERVER_URL=https://dp-reintegration.gov.ua`, потім `sudo systemctl restart nartu-site`.

## Важливо

- **Адмінкою на сервері** редагуйте контент (новини, сторінки, картинки) — він зберігається в базі на сервері.
- **Через GitHub** оновлюється лише код (дизайн, функції). База й файли сервера при оновленні **не змінюються**.
- Не редагуйте файли в `/opt/nartu` вручну — наступне оновлення їх перезапише.
