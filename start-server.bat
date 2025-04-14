@echo off
echo Starting ReviewRadar server...

:: Using npx to ensure cross-env and tsx are found in node_modules
:: This prevents the 'NODE_ENV' is not recognized error on Windows
call npx cross-env NODE_ENV=development npx tsx server/index.ts

:: If the server crashes, this pause will keep the window open
pause