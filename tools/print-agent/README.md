# GameMaster Guide — Print Agent

Automatically prints food orders from GameMaster Guide to your kitchen's
Epson thermal receipt printer.

## What You Need

- An Epson thermal receipt printer connected to your WiFi/Ethernet network
  (any ESC/POS compatible printer works — TM-T20, TM-T88, TM-m30, etc.)
- A device on the same network running Python 3.8+
  (Raspberry Pi recommended — $35, always on, silent, tiny)
- Your printer's IP address (usually found via the printer's self-test or
  your router's device list)

## Quick Setup

1. Find your printer's IP address
   - Print a self-test page (usually hold the feed button while powering on)
   - Or check your router's connected devices list
   - Common default: 192.168.1.100

2. Run the installer
   ```
   # Linux/Mac/Pi
   chmod +x install.sh && ./install.sh

   # Windows
   install.bat
   ```

3. Edit .env with your printer IP and API key
   ```
   GMG_PRINTER_IP=192.168.1.xxx    # Your printer's IP
   GMG_PRINT_API_KEY=xxx           # Tim will provide this
   ```

4. Test the printer connection
   ```
   python -c "from escpos.printer import Network; p = Network('192.168.1.xxx'); p.text('Test OK\n'); p.cut(); p.close()"
   ```

5. Start the agent
   ```
   python print_agent.py
   ```

## Run on Startup (Raspberry Pi)

Add to crontab so it starts automatically:
```
crontab -e
# Add this line:
@reboot cd /home/pi/print-agent && source venv/bin/activate && python print_agent.py >> /home/pi/print-agent/agent.log 2>&1 &
```

## Troubleshooting

- **"Printer not reachable"**: Check the IP, make sure the printer and this
  device are on the same network, and that port 9100 is open.
- **"Failed to fetch orders"**: Check your internet connection and API key.
- **Orders printing twice**: The agent marks orders as printed. If it crashes
  mid-print, it may retry on restart. This is by design — a duplicate ticket
  is better than a missed one.
- **Agent keeps running after Ctrl+C**: Use `kill $(pgrep -f print_agent)`.

## Recommended Hardware

- **Epson TM-m30III** (~$300): Compact, WiFi + Ethernet, perfect for countertop
- **Epson TM-T20III** (~$200): Ethernet, reliable workhorse
- **Any generic ESC/POS printer**: $50-100 on Amazon, works fine for kitchen tickets
  - Search "80mm thermal receipt printer ethernet" — most support ESC/POS
