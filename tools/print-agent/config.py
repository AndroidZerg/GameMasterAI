"""Configuration for the GameMaster Guide Print Agent."""

import os

# Try loading .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Backend API
API_BASE_URL = os.getenv("GMG_API_URL", "https://gmai-backend.onrender.com")
API_KEY = os.getenv("GMG_PRINT_API_KEY", "")
VENUE_ID = os.getenv("GMG_VENUE_ID", "meetup")

# Printer connection mode: "network", "usb", or "windows"
PRINTER_MODE = os.getenv("GMG_PRINTER_MODE", "windows")

# Network printer (ESC/POS over TCP)
PRINTER_IP = os.getenv("GMG_PRINTER_IP", "192.168.1.100")
PRINTER_PORT = int(os.getenv("GMG_PRINTER_PORT", "9100"))

# Windows USB printer (shared printer name)
PRINTER_NAME = os.getenv("GMG_PRINTER_NAME", "EPSON TM-T88V")

# Polling
POLL_INTERVAL_SECONDS = int(os.getenv("GMG_POLL_INTERVAL", "5"))
HEARTBEAT_INTERVAL_SECONDS = int(os.getenv("GMG_HEARTBEAT_INTERVAL", "60"))
MAX_RETRIES = 3

# Venue branding (printed on receipt header)
VENUE_NAME = os.getenv("GMG_VENUE_NAME", "Thai House")
VENUE_TAGLINE = os.getenv("GMG_VENUE_TAGLINE", "Authentic Thai Cuisine")
