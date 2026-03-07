@echo off
echo GameMaster Guide — Print Agent Setup
echo ======================================

python --version || (echo Python 3 required. Install it first. && exit /b 1)

python -m venv venv
call venv\Scripts\activate

pip install -r requirements.txt

if not exist .env (
    echo Creating .env file — you'll need to fill in the values
    (
        echo GMG_API_URL=https://gmai-backend.onrender.com
        echo GMG_PRINT_API_KEY=your_api_key_here
        echo GMG_VENUE_ID=meetup
        echo GMG_PRINTER_IP=192.168.1.100
        echo GMG_PRINTER_PORT=9100
        echo GMG_VENUE_NAME=Thai House
        echo GMG_VENUE_TAGLINE=Authentic Thai Cuisine
        echo GMG_POLL_INTERVAL=5
    ) > .env
    echo.
    echo IMPORTANT: Edit .env with your printer's IP address and API key
)

echo.
echo Setup complete! To run:
echo   venv\Scripts\activate
echo   python print_agent.py
