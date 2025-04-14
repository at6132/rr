@echo off
echo Starting ReviewRadar server on alternate port 3000...

:: Check if cross-env is installed
WHERE cross-env >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Installing cross-env package...
    call npm install cross-env --no-save
)

:: Check if tsx is installed
WHERE tsx >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Installing tsx package...
    call npm install tsx --no-save
)

:: Using npx to ensure cross-env and tsx are found in node_modules
:: This prevents the 'NODE_ENV' is not recognized error on Windows
echo Starting server with development environment on port 3000...
call npx cross-env NODE_ENV=development PORT=3000 npx tsx server/index.ts

:: If the server crashes, this pause will keep the window open
pause