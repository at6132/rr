@echo off
echo Starting ReviewRadar server on alternate port 3000...
npx cross-env NODE_ENV=development PORT=3000 tsx server/index.ts
pause