@echo off
REM Run while FF8 is in a battle. Writes memory-dump.txt next to this file.
"%~dp0node_modules\electron\dist\electron.exe" "%~dp0dump.js"
echo.
echo Wrote memory-dump.txt
type "%~dp0memory-dump.txt"
pause
