#!/usr/bin/env bash
# Перше встановлення сайту НАРТУ на чистий Linux-сервер (Ubuntu / Debian).
#
#   curl -fsSL https://raw.githubusercontent.com/sleepwalker108/vibe-site/main/deploy/install.sh -o install.sh
#   sudo bash install.sh                 # сайт за IP-адресою сервера
#   sudo bash install.sh мій-домен.ua    # або одразу з доменом
#
# Якщо поруч лежить /tmp/nartu-data.tar.gz (база + завантажені файли з комп'ютера) — він підхопиться автоматично.
# Повторний запуск безпечний: те, що вже є, не перезаписується.
set -euo pipefail

REPO="${REPO:-https://github.com/sleepwalker108/vibe-site.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="/opt/nartu"
SITE_DIR="$APP_DIR/site"
APP_USER="nartu"
DATA_ARCHIVE="${DATA_ARCHIVE:-/tmp/nartu-data.tar.gz}"
DOMAIN="${1:-}"

say() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }
as_app() { sudo -u "$APP_USER" -H bash -c "cd '$SITE_DIR' && $*"; }

[ "$(id -u)" = "0" ] || fail "Запустіть так:  sudo bash install.sh"
command -v apt-get >/dev/null || fail "Цей скрипт для Ubuntu/Debian (потрібен apt-get)."
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
HOST="${DOMAIN:-$IP}"

say "1/9 Системні пакети (git, nginx, sqlite3…)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates nginx sqlite3 openssl >/dev/null
ok "Готово"

say "2/9 Node.js"
NODE_MAJOR=$(node -v 2>/dev/null | sed -E 's/v([0-9]+).*/\1/' || echo 0)
if [ "${NODE_MAJOR:-0}" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
ok "Node $(node -v), npm $(npm -v)"

say "3/9 Пам'ять для збірки"
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
SWAP_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$MEM_MB" -lt 3500 ] && [ "$SWAP_MB" -lt 1000 ] && [ ! -f /swapfile ]; then
  fallocate -l 3G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "Додано файл підкачки 3 ГБ (оперативної пам'яті лише ${MEM_MB} МБ)"
else
  ok "Пам'яті достатньо (${MEM_MB} МБ)"
fi

say "4/9 Користувач і код сайту"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$APP_DIR"
  chown "$APP_USER:$APP_USER" "$APP_DIR"
  sudo -u "$APP_USER" git clone --quiet --branch "$BRANCH" "$REPO" "$APP_DIR"
else
  ok "Код уже є — оновлення робить команда nartu-update"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
ok "$(git -C "$APP_DIR" log -1 --format='Версія %h «%s»')"

say "5/9 База даних і завантажені файли"
if [ -f "$SITE_DIR/site.db" ]; then
  ok "База вже на місці — не чіпаю"
elif [ -f "$DATA_ARCHIVE" ]; then
  tar -xzf "$DATA_ARCHIVE" -C "$SITE_DIR"
  chown -R "$APP_USER:$APP_USER" "$SITE_DIR/site.db" "$SITE_DIR/media" 2>/dev/null || true
  ok "Перенесено з $DATA_ARCHIVE: база й $(find "$SITE_DIR/media" -type f 2>/dev/null | wc -l) файлів"
else
  warn "Архіву $DATA_ARCHIVE немає — сайт стартує з порожньою базою (першого адміністратора створите в /admin)."
fi

say "6/9 Налаштування (.env)"
if [ ! -f "$SITE_DIR/.env" ]; then
  SCHEME=http
  cat > "$SITE_DIR/.env" <<EOF
# Налаштування сайту на сервері. НЕ заливати на GitHub.
DATABASE_URL=file:./site.db
PAYLOAD_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_SERVER_URL=$SCHEME://$HOST
EOF
  chown "$APP_USER:$APP_USER" "$SITE_DIR/.env"
  chmod 600 "$SITE_DIR/.env"
  ok "Створено (секретний ключ згенеровано автоматично)"
else
  ok "Вже є — не чіпаю"
fi

say "7/9 Бібліотеки, база, збірка (5–10 хвилин)"
as_app "npm ci --no-audit --no-fund --loglevel=error"
as_app "NODE_OPTIONS=--no-deprecation npx payload migrate"
as_app "npm run build > /tmp/nartu-build.log 2>&1" || { tail -40 /tmp/nartu-build.log; fail "Збірка не вдалася (журнал: /tmp/nartu-build.log)"; }
ok "Зібрано"

say "8/9 Служба сайту, команда оновлення, щоденні копії"
install -m 644 "$APP_DIR/deploy/nartu-site.service" /etc/systemd/system/nartu-site.service
systemctl daemon-reload
systemctl enable --now nartu-site >/dev/null 2>&1
systemctl restart nartu-site
install -m 755 "$APP_DIR/deploy/update.sh" /usr/local/bin/nartu-update
install -m 755 "$APP_DIR/deploy/backup.sh" /usr/local/bin/nartu-backup
echo "15 3 * * * root /usr/local/bin/nartu-backup >/var/log/nartu-backup.log 2>&1" > /etc/cron.d/nartu-backup
ok "Служба nartu-site увімкнена; команди nartu-update і nartu-backup встановлено; копії щодня о 03:15"

say "9/9 Веб-сервер nginx"
sed "s/__DOMAIN__/${DOMAIN:-_}/" "$APP_DIR/deploy/nginx.conf" > /etc/nginx/sites-available/nartu
ln -sf /etc/nginx/sites-available/nartu /etc/nginx/sites-enabled/nartu
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 || fail "Помилка в налаштуваннях nginx (nginx -t)"
systemctl reload nginx
if command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then ufw allow 'Nginx Full' >/dev/null; fi

for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1/ || true)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "${code:-000}" = "200" ] || fail "Сайт не відповідає (код ${code:-000}). Журнал: journalctl -u nartu-site -n 80"

printf '\n\033[1;32m════════════════════════════════════════════\033[0m\n'
ok "Сайт працює:   http://$HOST"
ok "Адмінка:       http://$HOST/admin"
echo "   Оновити після змін на GitHub:  sudo nartu-update"
echo "   Резервна копія вручну:          sudo nartu-backup"
echo "   Стан / журнал:                  systemctl status nartu-site  |  journalctl -u nartu-site -f"
[ -n "$DOMAIN" ] && echo "   HTTPS (коли домен уже вказує на цей сервер):  sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d $DOMAIN"
printf '\033[1;32m════════════════════════════════════════════\033[0m\n'
