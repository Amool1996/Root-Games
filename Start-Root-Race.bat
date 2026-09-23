@echo off
REM ------------------------------------------------------------------------------
REM  ROOT RACE - booth launcher
REM  Opens the game full screen in Microsoft Edge with sound allowed to start on its
REM  own, so the title music plays the moment the screen comes up (no tap needed).
REM  Double-click this file. Press Alt+F4 to quit.
REM ------------------------------------------------------------------------------
cd /d "%~dp0"
set "GAME=%~dp0root-architect.html"

where msedge >nul 2>&1
if %errorlevel%==0 (
  start "" msedge --kiosk "file:///%GAME%" --edge-kiosk-type=fullscreen --autoplay-policy=no-user-gesture-required --disable-features=TranslateUI
  exit /b
)

REM Edge not on PATH - try its usual location
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk "file:///%GAME%" --edge-kiosk-type=fullscreen --autoplay-policy=no-user-gesture-required
  exit /b
)

REM Fall back to Chrome if that is what the laptop has
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk "file:///%GAME%" --autoplay-policy=no-user-gesture-required
  exit /b
)

REM Last resort: default browser (music will wait for the first tap)
start "" "%GAME%"
