@echo off
echo Starting ReviewRadar server...
set NODE_ENV=development
npx tsx server/index.ts
pause