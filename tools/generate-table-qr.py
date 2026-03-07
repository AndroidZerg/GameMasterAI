#!/usr/bin/env python3
"""Generate QR code PNGs for Thai House table numbers.

Usage: python tools/generate-table-qr.py [--tables 20]

Generates QR codes that link to: https://playgmg.com/thaihouse?table={n}
Output: tools/table-qr/table-{n}.png

Requires: pip install qrcode[pil]
"""

import sys
from pathlib import Path

try:
    import qrcode
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Install dependencies: pip install qrcode[pil]")
    sys.exit(1)

OUTPUT_DIR = Path(__file__).parent / "table-qr"
BASE_URL = "https://playgmg.com/thaihouse"


def generate_table_qr(table_num: int):
    """Generate a QR code PNG for a single table."""
    url = f"{BASE_URL}?table={table_num}"

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)

    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_w, qr_h = qr_img.size

    # Add table number text below QR
    label_height = 60
    final = Image.new("RGB", (qr_w, qr_h + label_height), "white")
    final.paste(qr_img, (0, 0))

    draw = ImageDraw.Draw(final)
    text = f"Table {table_num}"

    # Try to use a nice font, fall back to default
    try:
        font = ImageFont.truetype("arial.ttf", 36)
    except (IOError, OSError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        except (IOError, OSError):
            font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_x = (qr_w - text_w) // 2
    text_y = qr_h + (label_height - (bbox[3] - bbox[1])) // 2

    draw.text((text_x, text_y), text, fill="black", font=font)
    return final


def main():
    num_tables = 20
    for arg in sys.argv[1:]:
        if arg.startswith("--tables"):
            num_tables = int(sys.argv[sys.argv.index(arg) + 1])

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for t in range(1, num_tables + 1):
        img = generate_table_qr(t)
        out_path = OUTPUT_DIR / f"table-{t}.png"
        img.save(out_path)
        print(f"Generated {out_path}")

    print(f"\nDone! {num_tables} QR codes saved to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
