#!/usr/bin/env bash
# Службові завдання сайту НАРТУ на сервері:  sudo nartu-task <назва>
#
#   sudo nartu-task import-wp-news           — перенести всі новини зі старого сайту (з картинками, PDF, EN)
#   sudo LIMIT=5 nartu-task import-wp-news   — лише 5 найновіших (для перевірки)
#   sudo nartu-task check-links              — перевірити посилання в новинах і сторінках
#
# Перед завданням робиться резервна копія бази.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nartu}"
SITE_DIR="$APP_DIR/site"
APP_USER="${APP_USER:-nartu}"
NAME="${1:-}"

[ "$(id -u)" = "0" ] || { echo "Запустіть так:  sudo nartu-task <назва>"; exit 1; }
if [ -z "$NAME" ] || [ ! -f "$SITE_DIR/src/scripts/$NAME.ts" ]; then
  echo "Доступні завдання:"
  ls "$SITE_DIR/src/scripts/"*.ts | xargs -n1 basename | sed 's/\.ts$//; s/^/   /'
  exit 1
fi

# Архів файлів старого сайту (wp-content/uploads), скопійований у /tmp, — розпаковуємо в $APP_DIR/wp-uploads:
# тоді картинки й PDF беруться з нього, а не завантажуються зі старого сайту.
UPLOADS_ARCHIVE="${UPLOADS_ARCHIVE:-/tmp/nartu-uploads.tar}"
if [ -f "$UPLOADS_ARCHIVE" ]; then
  echo "Розпаковую $UPLOADS_ARCHIVE → $APP_DIR/wp-uploads"
  mkdir -p "$APP_DIR/wp-uploads"
  tar -xf "$UPLOADS_ARCHIVE" -C "$APP_DIR/wp-uploads"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR/wp-uploads"
  rm -f "$UPLOADS_ARCHIVE"
fi

"$APP_DIR/deploy/backup.sh" --db-only
sudo -u "$APP_USER" -H env LIMIT="${LIMIT:-}" ONLY_NEW="${ONLY_NEW:-}" bash -c \
  "cd '$SITE_DIR' && NODE_OPTIONS=--no-deprecation npx payload run 'src/scripts/$NAME.ts'"
