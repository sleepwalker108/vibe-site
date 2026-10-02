@echo off
rem Launches the site and admin. Keep this file ASCII-only: cmd misreads UTF-8 text in .bat files.
chcp 65001 >nul
title NARTU site - keep this window open while you work
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0site"
node scripts\start.mjs
echo.
pause
