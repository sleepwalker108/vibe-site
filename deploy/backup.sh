#!/usr/bin/env bash
# Резервна копія сайту НАРТУ: база (site.db) і, якщо без --db-only, завантажені файли (media).
# Щодня запускається автоматично (cron), а також перед кожним оновленням.
# Зберігаються останні 30 копій бази й 14 копій файлів у /opt/nartu/backups.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nartu}"
SITE_DIR="$APP_DIR/site"
DEST="$APP_DIR/backups"
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"

# «гаряча» копія бази — коректна навіть тоді, коли сайт працює
sqlite3 "$SITE_DIR/site.db" ".backup '$DEST/site-$STAMP.db'"
gzip -f "$DEST/site-$STAMP.db"
echo "База: $DEST/site-$STAMP.db.gz"

if [ "${1:-}" != "--db-only" ] && [ -d "$SITE_DIR/media" ]; then
  tar -czf "$DEST/media-$STAMP.tar.gz" -C "$SITE_DIR" media
  echo "Файли: $DEST/media-$STAMP.tar.gz"
fi

# старі копії прибираємо
ls -1t "$DEST"/site-*.db.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
ls -1t "$DEST"/media-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
chown -R "${APP_USER:-nartu}:${APP_USER:-nartu}" "$DEST" 2>/dev/null || true
