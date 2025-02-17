@echo off
title Discord Bot Auto Restart
color 0a

:start
echo [%time%] Bot is starting...
node index.js
echo [%time%] Bot crashed or stopped! Restarting in 5 seconds...
timeout /t 5 /nobreak
goto start 