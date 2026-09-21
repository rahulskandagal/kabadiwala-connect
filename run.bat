@echo off
setlocal
cd /d "%~dp0"
set PORT=8090
echo.
echo  Kabadiwala Connect - local server
echo  ================================
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP: =%
echo  Laptop:  http://localhost:%PORT%/start.html
if defined IP echo  Phone (same Wi-Fi): http://%IP%:%PORT%/start.html
echo.
echo  Press Ctrl+C to stop.
echo.
start "" "http://localhost:%PORT%/start.html"
where python >nul 2>nul && ( python -m http.server %PORT% & goto :eof )
where py >nul 2>nul && ( py -m http.server %PORT% & goto :eof )
where npx >nul 2>nul && ( npx --yes serve -l %PORT% . & goto :eof )
echo  Neither Python nor Node.js found. Install Python from https://www.python.org/downloads/ (tick "Add to PATH") and run again.
pause
