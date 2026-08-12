@echo off
pip install -r requirements.txt
pyinstaller --noconfirm --onefile --windowed --name "DailyTracker" app.py
echo.
echo Build complete. Find DailyTracker.exe in the dist folder.
pause
