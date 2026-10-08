#!/usr/bin/env bash
# Оновлення сайту НАРТУ на сервері однією командою:  sudo nartu-update
#
# Що робить:
#   1. робить резервну копію бази;
#   2. забирає нові зміни з GitHub (git pull);
#   3. ставить нові бібліотеки, якщо вони змінилися;
#   4. оновлює структуру бази (міграції);
#   5. збирає нову версію сайту ПОРУЧ зі старою (сайт у цей час працює);
#   6. за кілька секунд підміняє стару версію новою й перевіряє, що сайт відповідає.
#      Якщо щось пішло не так — автоматично повертає попередню версію.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nartu}"
SITE_DIR="$APP_DIR/site"
APP_USER="${APP_USER:-nartu}"
SERVICE="nartu-site"
PORT="${PORT:-3000}"
BRANCH="${BRANCH:-main}"

say() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }
as_app() { sudo -u "$APP_USER" -H bash -c "cd '$SITE_DIR' && $*"; }
# Якщо оновлення зупинилося на півдорозі — повертаємо код до попередньої версії, щоб наступний
# запуск nartu-update знову побачив нові зміни й спробував ще раз (інакше він скаже «змін немає»)
rollback_code() {
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard --quiet "$BEFORE"
  # бібліотеки могли встигнути змінитися — повертаємо ті, що були (сайт має стартувати після перезапуску)
  if [ "${1:-}" = "deps" ]; then as_app "npm ci --no-audit --no-fund --loglevel=error" || true; fi
}

[ "$(id -u)" = "0" ] || fail "Запустіть так:  sudo nartu-update"
[ -d "$SITE_DIR/.git" ] || [ -d "$APP_DIR/.git" ] || fail "Не знайдено сайт у $APP_DIR (спершу встановіть: deploy/install.sh)"

say "1/6 Резервна копія бази"
"$APP_DIR/deploy/backup.sh" --db-only || fail "Не вдалося зробити резервну копію — оновлення скасовано"

say "2/6 Забираю зміни з GitHub"
BEFORE=$(sudo -u "$APP_USER" git -C "$APP_DIR" rev-parse HEAD)
sudo -u "$APP_USER" git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
sudo -u "$APP_USER" git -C "$APP_DIR" merge --ff-only "origin/$BRANCH" || fail "Не вдалося оновити код (на сервері є власні зміни?). Нічого не змінено."
AFTER=$(sudo -u "$APP_USER" git -C "$APP_DIR" rev-parse HEAD)
if [ "$BEFORE" = "$AFTER" ] && [ "${FORCE:-0}" != "1" ]; then
  ok "Нових змін немає — сайт уже найсвіжіший. (Щоб перезібрати все одно: sudo FORCE=1 nartu-update)"
  exit 0
fi
sudo -u "$APP_USER" git -C "$APP_DIR" log --oneline "$BEFORE..$AFTER" | sed 's/^/   • /' || true
# службові команди могли змінитися — ставимо свіжі версії
install -m 755 "$APP_DIR/deploy/update.sh" /usr/local/bin/nartu-update
install -m 755 "$APP_DIR/deploy/backup.sh" /usr/local/bin/nartu-backup
[ -f "$APP_DIR/deploy/task.sh" ] && install -m 755 "$APP_DIR/deploy/task.sh" /usr/local/bin/nartu-task
# налаштування nginx (захист, обмеження частоти входу) — оновлюємо, якщо змінилися.
# Якщо вже підключено HTTPS (certbot дописав сертифікат) — файл не чіпаємо, щоб не зламати HTTPS.
NGX=/etc/nginx/sites-available/nartu
if [ -f "$NGX" ] && ! grep -q ssl_certificate "$NGX"; then
  DOM=$(awk '/^[[:space:]]*server_name/ {gsub(";", "", $2); print $2; exit}' "$NGX")
  sed "s/__DOMAIN__/${DOM:-_}/" "$APP_DIR/deploy/nginx.conf" > /tmp/nartu-nginx.conf
  if ! cmp -s /tmp/nartu-nginx.conf "$NGX"; then
    cp "$NGX" "$NGX.bak"
    cp /tmp/nartu-nginx.conf "$NGX"
    if nginx -t >/dev/null 2>&1; then
      systemctl reload nginx && ok "Налаштування nginx оновлено"
    else
      cp "$NGX.bak" "$NGX"
      printf '\033[1;33m! Нові налаштування nginx не пройшли перевірку — лишено попередні\033[0m\n'
    fi
  fi
fi

# ffmpeg — для стиснення відео під веб (якщо немає системної, сайт використає вбудовану з пакета)
command -v ffmpeg >/dev/null 2>&1 || { apt-get install -y -qq ffmpeg >/dev/null 2>&1 && ok "Встановлено ffmpeg (стиснення відео)"; } || true

say "3/6 Бібліотеки"
if [ "$BEFORE" = "$AFTER" ] || ! git -C "$APP_DIR" diff --quiet "$BEFORE" "$AFTER" -- site/package-lock.json; then
  as_app "npm ci --no-audit --no-fund" || {
    rollback_code deps
    fail "Не вдалося встановити бібліотеки. Код повернуто до попередньої версії, сайт працює як і раніше. Спробуйте ще раз: sudo nartu-update"
  }
else
  ok "Без змін"
fi

say "4/6 Структура бази (міграції)"
if ! as_app "NODE_OPTIONS=--no-deprecation npx payload migrate"; then
  # бібліотеки повертаємо лише якщо вони змінювалися в цьому оновленні
  git -C "$APP_DIR" diff --quiet "$BEFORE" "$AFTER" -- site/package-lock.json && rollback_code || rollback_code deps
  fail "Помилка міграції бази (текст помилки — вище). Код повернуто до попередньої версії, сайт працює як і раніше; копія бази — у $APP_DIR/backups. Спробуйте ще раз: sudo nartu-update"
fi

say "5/6 Збираю нову версію (сайт тим часом працює)"
rm -rf "$SITE_DIR/.next-build"
if ! as_app "NEXT_DIST_DIR=.next-build npm run build > /tmp/nartu-build.log 2>&1"; then
  tail -40 /tmp/nartu-build.log
  rm -rf "$SITE_DIR/.next-build"
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard --quiet "$BEFORE"
  fail "Збірка не вдалася (повний журнал: /tmp/nartu-build.log). Код повернуто до попередньої версії, сайт працює як і раніше."
fi

say "6/6 Вмикаю нову версію"
rm -rf "$SITE_DIR/.next-old"
[ -d "$SITE_DIR/.next" ] && mv "$SITE_DIR/.next" "$SITE_DIR/.next-old"
mv "$SITE_DIR/.next-build" "$SITE_DIR/.next"
systemctl restart "$SERVICE"

for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$PORT/" || true)
  [ "$code" = "200" ] && break
  sleep 2
done
if [ "${code:-000}" != "200" ]; then
  printf '\033[1;33m! Нова версія не відповідає (код %s) — повертаю попередню\033[0m\n' "${code:-000}"
  rm -rf "$SITE_DIR/.next" && mv "$SITE_DIR/.next-old" "$SITE_DIR/.next"
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard --quiet "$BEFORE"
  systemctl restart "$SERVICE"
  fail "Оновлення скасовано, сайт працює на попередній версії. Журнал: journalctl -u $SERVICE -n 80"
fi
rm -rf "$SITE_DIR/.next-old"
ok "Готово! Сайт оновлено до версії $(git -C "$APP_DIR" log -1 --format='%h «%s»')"
