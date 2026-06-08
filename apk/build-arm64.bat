@echo off
setlocal
cd /d "%~dp0"

if not exist "bsd_brawl_v67.264.apk" (
  echo ERROR: Place bsd_brawl_v67.264.apk in the apk folder before building.
  exit /b 1
)

where frida-gadget >nul 2>&1
if errorlevel 1 (
  echo ERROR: frida-gadget not found. Install with: pip install frida-gadget --upgrade
  exit /b 1
)

copy /Y config.arm64.txt config.txt >nul
frida-gadget bsd_brawl_v67.264.apk --arch arm64 --config config.txt --js index.js --sign
if errorlevel 1 exit /b 1
echo Built ARM64 APK for real Android devices.
endlocal
