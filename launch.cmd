@echo off
REM Launch FF8 Battle Mod (enemy/party HP editor) without needing Node.
REM Make sure FINAL FANTASY VIII (FF8_EN.exe) is running and you are in battle.
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0"
