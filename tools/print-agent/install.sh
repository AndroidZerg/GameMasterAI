#!/bin/bash
echo "GameMaster Guide — Print Agent Setup"
echo "======================================"

# Check Python
python3 --version || { echo "Python 3 required. Install it first."; exit 1; }

# Create venv
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file — you'll need to fill in the values"
    cat > .env << 'EOF'
GMG_API_URL=https://gmai-backend.onrender.com
GMG_PRINT_API_KEY=your_api_key_here
GMG_VENUE_ID=meetup
GMG_PRINTER_IP=192.168.1.100
GMG_PRINTER_PORT=9100
GMG_VENUE_NAME=Thai House
GMG_VENUE_TAGLINE=Authentic Thai Cuisine
GMG_POLL_INTERVAL=5
EOF
    echo ""
    echo "IMPORTANT: Edit .env with your printer's IP address and API key"
    echo "  nano .env"
fi

echo ""
echo "Setup complete! To run:"
echo "  source venv/bin/activate"
echo "  python print_agent.py"
