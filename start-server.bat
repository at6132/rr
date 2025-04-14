@echo off
echo Starting ReviewRadar server...
npx cross-env NODE_ENV=development tsx server/index.ts
pause