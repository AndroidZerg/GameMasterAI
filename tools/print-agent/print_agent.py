"""GameMaster Guide -- Local Print Agent.

Polls the GMG backend for new orders and prints them on an Epson thermal printer.
"""

import time
import sys
import logging
import requests

from config import (
    API_BASE_URL, API_KEY, VENUE_ID, PRINTER_MODE, PRINTER_IP, PRINTER_PORT,
    PRINTER_NAME, POLL_INTERVAL_SECONDS, HEARTBEAT_INTERVAL_SECONDS,
    VENUE_NAME, VENUE_TAGLINE,
)
from receipt_formatter import format_receipt

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("print_agent.log"),
    ],
)
log = logging.getLogger(__name__)


def poll_orders():
    """Fetch pending orders from the backend."""
    try:
        resp = requests.get(
            f"{API_BASE_URL}/api/print-queue",
            params={"venue_id": VENUE_ID, "status": "pending"},
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("orders", [])
    except requests.RequestException as e:
        log.error(f"Failed to fetch orders: {e}")
        return []


def _get_printer():
    """Create a printer instance based on configured mode."""
    if PRINTER_MODE == "network":
        from escpos.printer import Network
        return Network(PRINTER_IP, PRINTER_PORT, timeout=10)
    elif PRINTER_MODE == "usb":
        from escpos.printer import Usb
        # Epson TM-T88V: vendor 0x04b8, product 0x0202
        return Usb(0x04b8, 0x0202, timeout=10)
    else:  # "windows"
        from escpos.printer import Win32Raw
        return Win32Raw(PRINTER_NAME)


def print_order(order):
    """Format and print a single order."""
    try:
        printer = _get_printer()
        receipt_commands = format_receipt(order, VENUE_NAME, VENUE_TAGLINE)
        receipt_commands(printer)
        printer.cut()
        printer.close()
        return True
    except Exception as e:
        log.error(f"Print failed for order {order.get('id')}: {e}")
        return False


def mark_printed(order_id, success, error=None):
    """Report print status back to the backend."""
    try:
        payload = (
            {"status": "printed"} if success
            else {"status": "failed", "error": str(error)}
        )
        requests.post(
            f"{API_BASE_URL}/api/print-queue/{order_id}/printed",
            json=payload,
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10,
        )
    except requests.RequestException as e:
        log.warning(f"Failed to update print status for {order_id}: {e}")


def send_heartbeat(printer_online):
    """Send heartbeat to the backend."""
    try:
        requests.post(
            f"{API_BASE_URL}/api/print-queue/heartbeat",
            json={
                "venue_id": VENUE_ID,
                "printer_id": PRINTER_NAME if PRINTER_MODE != "network" else PRINTER_IP,
                "printer_status": "online" if printer_online else "offline",
                "agent_uptime_seconds": int(time.time() - _start_time),
            },
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10,
        )
    except requests.RequestException as e:
        log.warning(f"Heartbeat failed: {e}")


_start_time = time.time()


def main():
    printer_desc = (
        f"{PRINTER_IP}:{PRINTER_PORT}" if PRINTER_MODE == "network"
        else PRINTER_NAME
    )
    log.info(f"Print Agent starting -- Venue: {VENUE_ID}, Mode: {PRINTER_MODE}, Printer: {printer_desc}")
    log.info(f"Polling {API_BASE_URL} every {POLL_INTERVAL_SECONDS}s")

    if not API_KEY:
        log.error("GMG_PRINT_API_KEY not set. Exiting.")
        sys.exit(1)

    # Quick printer connectivity check on startup
    printer_online = False
    try:
        test = _get_printer()
        test.close()
        log.info("Printer connection OK")
        printer_online = True
    except Exception as e:
        log.warning(f"Printer not reachable at startup: {e}")
        log.warning("Will retry when orders arrive...")

    last_heartbeat = 0

    while True:
        # Send heartbeat periodically
        now = time.time()
        if now - last_heartbeat >= HEARTBEAT_INTERVAL_SECONDS:
            send_heartbeat(printer_online)
            last_heartbeat = now

        orders = poll_orders()
        if orders:
            log.info(f"Found {len(orders)} pending order(s)")

        for order in orders:
            order_id = order.get("id", "unknown")
            order_num = order.get("order_number", "?")
            log.info(f"Printing order #{order_num} ({order_id})")

            success = print_order(order)
            mark_printed(order_id, success)
            printer_online = success

            if success:
                log.info(f"Order #{order_num} printed successfully")
            else:
                log.error(f"Order #{order_num} print FAILED")

        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
