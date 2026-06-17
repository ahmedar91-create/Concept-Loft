@echo off
title CONCEPT LOFT - ERP
cd /d "%~dp0"
echo ============================================
echo    CONCEPT LOFT - ERP
echo ============================================
echo.
if not exist node_modules goto install
goto run
:install
echo Premiere utilisation : installation des composants (1-2 min)...
call npm install
echo.
:run
echo Demarrage du serveur...
echo Le navigateur va s ouvrir sur http://localhost:5173
echo.
echo  ^>^>^> Laissez cette fenetre OUVERTE pendant l utilisation. ^<^<^<
echo  ^>^>^> Fermez cette fenetre pour arreter l application. ^<^<^<
echo.
start "" /b cmd /c "ping -n 5 127.0.0.1 >nul & start http://localhost:5173"
call npm run dev
echo.
echo Le serveur est arrete.
pause
