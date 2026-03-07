#!/usr/bin/env python3
"""Migrate meetup.json from protein_options/spice_range to toggle-based schema.

Reads current meetup.json, adds top-level 'toggles' array,
converts each item's protein_options → toggles:["protein"] and spice_range → toggles:["spice"],
removes old fields, writes back.
"""

import json
from pathlib import Path

MENU_JSON = Path(__file__).resolve().parents[1] / "content" / "menus" / "meetup.json"

TOGGLES = [
    {
        "id": "protein",
        "name": "Protein Choice",
        "required": True,
        "options": [
            {"name": "Chicken", "upcharge": 0},
            {"name": "Pork", "upcharge": 0},
            {"name": "Beef", "upcharge": 0},
            {"name": "Shrimp", "upcharge": 2.00},
            {"name": "Tofu", "upcharge": 0},
            {"name": "Vegetables", "upcharge": 0},
        ],
    },
    {
        "id": "spice",
        "name": "Spice Level",
        "required": True,
        "options": [
            {"name": "1 - Mild", "upcharge": 0},
            {"name": "2", "upcharge": 0},
            {"name": "3", "upcharge": 0},
            {"name": "4", "upcharge": 0},
            {"name": "5 - Medium", "upcharge": 0},
            {"name": "6", "upcharge": 0},
            {"name": "7", "upcharge": 0},
            {"name": "8 - Hot", "upcharge": 0},
            {"name": "9", "upcharge": 0},
            {"name": "10 - Thai Hot", "upcharge": 0},
        ],
    },
]


def main():
    with open(MENU_JSON, encoding="utf-8") as f:
        menu = json.load(f)

    # Add toggles at root
    menu["toggles"] = TOGGLES

    migrated = 0
    for section in menu["sections"]:
        for item in section["items"]:
            item_toggles = []

            # Convert protein_options → protein toggle
            if "protein_options" in item:
                item_toggles.append("protein")
                del item["protein_options"]

            # Convert spice_range → spice toggle
            if "spice_range" in item:
                item_toggles.append("spice")
                del item["spice_range"]

            if item_toggles:
                item["toggles"] = item_toggles
                migrated += 1

    with open(MENU_JSON, "w", encoding="utf-8") as f:
        json.dump(menu, f, indent=2, ensure_ascii=False)

    print(f"Migration complete: {migrated} items updated")
    print(f"Toggles added: {[t['id'] for t in TOGGLES]}")


if __name__ == "__main__":
    main()
