@echo off
echo ========================================
echo  Inventario TI - Build Android APK
echo ========================================
echo.

set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%PATH%

echo [1/3] Compilando app web...
call npm run build
if %ERRORLEVEL% neq 0 ( echo ERRO no build web. & pause & exit /b 1 )

echo [2/3] Sincronizando com Android...
call npx cap sync android
if %ERRORLEVEL% neq 0 ( echo ERRO no sync. & pause & exit /b 1 )

echo [3/3] Gerando APK...
cd android
call gradlew.bat assembleDebug
if %ERRORLEVEL% neq 0 ( echo ERRO no build Android. & pause & exit /b 1 )
cd ..

echo.
echo ========================================
echo  APK gerado com sucesso!
echo  Local: android\app\build\outputs\apk\debug\app-debug.apk
echo ========================================
echo.
pause
