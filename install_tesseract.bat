@echo off
REM Tesseract-OCR Installation Script for Windows
REM This script downloads and installs Tesseract-OCR automatically

echo.
echo ========================================
echo Tesseract-OCR Installation Script
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Set installation directory
set INSTALL_DIR=C:\Program Files\Tesseract-OCR
set INSTALLER_NAME=tesseract-ocr-w64-setup-v5.3.0.exe
set DOWNLOAD_URL=https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.0/%INSTALLER_NAME%
set TEMP_DIR=%TEMP%\tesseract_install

echo Creating temporary directory...
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

echo.
echo Downloading Tesseract-OCR installer...
echo URL: %DOWNLOAD_URL%
echo.

REM Download using PowerShell
powershell -Command "& {
    $ProgressPreference = 'SilentlyContinue'
    try {
        Write-Host 'Downloading Tesseract-OCR...'
        Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%TEMP_DIR%\%INSTALLER_NAME%' -UseBasicParsing
        Write-Host 'Download completed successfully!'
    } catch {
        Write-Host 'ERROR: Failed to download Tesseract-OCR'
        Write-Host 'Error: ' $_
        exit 1
    }
}"

if %errorLevel% neq 0 (
    echo ERROR: Failed to download Tesseract-OCR
    echo.
    echo Please download manually from:
    echo https://github.com/UB-Mannheim/tesseract/wiki
    echo.
    pause
    exit /b 1
)

echo.
echo Running Tesseract-OCR installer...
echo Installation directory: %INSTALL_DIR%
echo.

REM Run the installer silently
"%TEMP_DIR%\%INSTALLER_NAME%" /S /D=%INSTALL_DIR%

if %errorLevel% neq 0 (
    echo ERROR: Installation failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation completed successfully!
echo ========================================
echo.

REM Verify installation
echo Verifying installation...
if exist "%INSTALL_DIR%\tesseract.exe" (
    echo.
    echo SUCCESS: Tesseract-OCR is installed at:
    echo %INSTALL_DIR%
    echo.
    echo Testing Tesseract...
    "%INSTALL_DIR%\tesseract.exe" --version
    echo.
    echo Tesseract is ready to use!
) else (
    echo ERROR: Tesseract-OCR was not found after installation
    pause
    exit /b 1
)

REM Clean up
echo.
echo Cleaning up temporary files...
rmdir /s /q "%TEMP_DIR%"

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Restart your backend server
echo 2. Try uploading a screenshot
echo 3. Extraction should now work!
echo.
pause
