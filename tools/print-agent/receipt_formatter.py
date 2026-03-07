"""Format orders as ESC/POS receipt commands for an Epson thermal printer.

Standard 80mm (3-inch) paper width = 48 characters per line.
"""

from datetime import datetime

RECEIPT_WIDTH = 48


def format_receipt(order, venue_name="Thai House", venue_tagline=""):
    """Return a function that accepts a printer object and executes print commands.

    This pattern keeps the formatter testable without a real printer.
    """

    def print_to(printer):
        # ===== HEADER =====
        printer.set(align="center", bold=True, double_height=True, double_width=True)
        printer.text(f"{venue_name}\n")
        printer.set(align="center", bold=False, double_height=False, double_width=False)
        if venue_tagline:
            printer.text(f"{venue_tagline}\n")
        printer.text("=" * RECEIPT_WIDTH + "\n")

        # ===== ORDER NUMBER (BIG) =====
        order_num = order.get("order_number", "?")
        printer.set(align="center", bold=True, double_height=True, double_width=True)
        printer.text(f"ORDER #{order_num}\n")
        printer.set(bold=False, double_height=False, double_width=False)

        # ===== CUSTOMER NAME =====
        customer = order.get("customer_name", "Guest")
        printer.set(align="center", bold=True)
        printer.text(f"Name: {customer}\n")

        # ===== TABLE NUMBER =====
        table_number = order.get("table_number")
        if table_number:
            printer.text(f"Table: {table_number}\n")

        printer.set(bold=False)
        printer.text("-" * RECEIPT_WIDTH + "\n")

        # ===== TIMESTAMP =====
        printer.set(align="left")
        now = datetime.now()
        printer.text(f"Time: {now.strftime('%I:%M %p')}  Date: {now.strftime('%m/%d/%Y')}\n")
        printer.text("-" * RECEIPT_WIDTH + "\n")

        # ===== ITEMS (normal width — double_width halves chars to 24) =====
        printer.set(align="left", bold=True, double_height=False, double_width=False)
        items = order.get("items", [])
        for item in items:
            qty = item.get("quantity", 1)
            name = item.get("name", "Unknown")
            price = item.get("price", 0)
            line_total = qty * price

            # Format: "2x Pad Thai                    $29.90"
            left = f"{qty}x {name}"
            right = f"${line_total:.2f}"
            spaces = RECEIPT_WIDTH - len(left) - len(right)
            if spaces < 1:
                max_name = RECEIPT_WIDTH - len(right) - len(f"{qty}x ") - 2
                left = f"{qty}x {name[:max_name]}.."
                spaces = RECEIPT_WIDTH - len(left) - len(right)

            printer.text(f"{left}{' ' * max(spaces, 1)}{right}\n")

            # Customization sub-lines
            extras = []
            custs = item.get("customizations") or {}
            for _tid, val in custs.items():
                if val:
                    extras.append(str(val))
            if item.get("is_drink_club"):
                extras.append("DRINK CLUB")
            if extras:
                printer.set(bold=False)
                printer.text(f"   > {', '.join(extras)}\n")
                printer.set(bold=True)
            if item.get("notes"):
                printer.set(bold=False)
                printer.text(f"   > {item['notes']}\n")
                printer.set(bold=True)

        printer.set(bold=False)
        printer.text("-" * RECEIPT_WIDTH + "\n")

        # ===== TOTAL =====
        subtotal = order.get("subtotal", sum(
            i.get("quantity", 1) * i.get("price", 0) for i in items
        ))
        printer.set(align="right", bold=True, double_height=True, double_width=False)
        printer.text(f"TOTAL: ${subtotal:.2f}\n")
        printer.set(bold=False, double_height=False, double_width=False)

        # ===== FOOTER =====
        printer.text("\n")
        printer.set(align="center")
        printer.text("Powered by GameMaster Guide\n")
        printer.text("playgmg.com\n")
        printer.text("\n\n")  # Feed paper before cut

    return print_to
