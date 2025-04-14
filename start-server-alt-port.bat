@echo off
echo Starting ReviewRadar server on alternate port 3000...
set NODE_ENV=development
set PORT=3000
npx tsx server/index.ts
pause