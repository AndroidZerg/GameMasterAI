"""One-time script to add descriptions to all score configs."""
import json
import os

scores_dir = os.path.join(os.path.dirname(__file__), "..", "content", "scores")

DESCRIPTIONS = {
    "above-and-below": {
        "village_points": "Points printed on built village cards",
        "reputation": "Points from your reputation track position",
        "coins": "1 point per 4 coins (round down)",
        "cave_points": "Points from explored cave story cards",
        "star_points": "Bonus points from star tokens earned",
    },
    "agricola": {
        "fields": "Points for plowed grain and vegetable fields",
        "pastures": "Points for fenced pasture areas",
        "grain": "Points based on total grain harvested",
        "vegetables": "Points based on total vegetables harvested",
        "sheep": "Points based on number of sheep",
        "wild_boar": "Points based on number of wild boar",
        "cattle": "Points based on number of cattle",
        "unused_spaces": "Negative points for empty farmyard spaces",
        "fenced_stables": "Points for stables in fenced pastures",
        "clay_rooms": "Points for clay hut rooms",
        "stone_rooms": "Points for stone house rooms",
        "family_members": "3 points per family member",
        "bonus_points": "Points from improvement and occupation cards",
    },
    "brass-birmingham": {
        "link_points": "Points from canal/rail links on the map",
        "industry_points": "Victory points on flipped industry tiles",
        "income_points": "Points from final income level position",
        "wild_points": "Points from wild location tiles",
    },
    "carcassonne": {
        "cities": "Points from completed and incomplete cities",
        "roads": "Points from completed and incomplete roads",
        "monasteries": "Points from completed and incomplete monasteries",
        "farms": "3 points per completed city touching your farm",
        "goods": "Bonus for majority in trade goods (wine, grain, cloth)",
        "builder_bonus": "Points from builder double-turn actions",
        "pig_bonus": "Extra farm points from pig placement",
    },
    "castles-of-burgundy": {
        "estate_points": "Points from placed estate tiles by region",
        "unsold_goods": "1 point per unsold goods tile",
        "worker_tiles": "Points from remaining worker tiles",
        "silverlings": "1 point per remaining silverling",
        "bonus_tiles": "Points from knowledge bonus tiles",
        "yellow_tiles": "Points from yellow knowledge tiles placed",
    },
    "century-spice-road": {
        "gold_coins": "3 points per gold coin collected",
        "silver_coins": "1 point per silver coin collected",
        "card_points": "Points printed on acquired victory point cards",
        "remaining_spices": "1 point per non-yellow spice cube remaining",
    },
    "clank": {
        "artifact_points": "Points from collected artifacts",
        "token_points": "Points from minor and major secrets",
        "card_points": "Points printed on acquired deck cards",
        "gold_points": "1 point per gold coin",
        "crown_points": "Points from crown tokens in the dungeon",
        "mastery_points": "Bonus points from mastery tokens",
    },
    "concordia": {
        "vesta_points": "Points from Vesta: 1 per good in storehouse",
        "jupiter_points": "Points from Jupiter: per non-brick house built",
        "saturnus_points": "Points from Saturnus: per province with houses",
        "mercurius_points": "Points from Mercurius: per type of good produced",
        "mars_points": "Points from Mars: 2 per colonist on the board",
        "minerva_points": "Points from Minerva: per matching specialist card",
        "concordia_bonus": "7 bonus points for having the Concordia card",
    },
    "dixit": {
        "correct_guesses": "Points from correctly guessing the storyteller card",
        "storyteller_points": "Points earned as storyteller (not all/none guessed)",
        "votes_received": "Points from other players voting for your decoy card",
    },
    "dominion": {
        "province_cards": "6 VP per Province card in deck",
        "duchy_cards": "3 VP per Duchy card in deck",
        "estate_cards": "1 VP per Estate card in deck",
        "vp_tokens": "Victory point tokens collected during game",
        "special_vp": "VP from special kingdom cards (Gardens, etc.)",
    },
    "everdell": {
        "base_points": "Points printed on played critter and construction cards",
        "prosperity_points": "Points from prosperity event cards achieved",
        "journey_points": "Points from journey destinations visited",
        "bonus_points": "Extra points from special card abilities at game end",
    },
    "great-western-trail": {
        "delivery_points": "Points from cattle delivery to Kansas City",
        "station_points": "Points from upgraded station master tiles",
        "hazard_points": "Points from hazard and teepee tiles passed",
        "worker_points": "Points from hired cowboys, craftsmen, engineers",
        "objective_points": "Points from completed objective cards",
        "coin_points": "1 point per 5 coins at game end",
    },
    "king-of-tokyo": {
        "victory_points": "Points from card effects and dice rolls",
        "tokyo_points": "Points earned from entering/staying in Tokyo",
        "card_points": "Points from purchased power cards",
    },
    "kingdomino": {
        "terrain_points": "Points per terrain type: connected squares x crown count",
        "center_bonus": "10 bonus points if castle is in center of 5x5 grid",
        "complete_bonus": "5 bonus points for completing the full 5x5 kingdom",
    },
    "lords-of-waterdeep": {
        "quest_points": "Victory points from completed quests",
        "building_points": "Points from buildings you own that others use",
        "intrigue_points": "Points gained from played intrigue cards",
        "lord_bonus": "Bonus points from your secret Lord card",
        "adventurer_points": "1 point per 2 remaining adventurers (round down)",
        "gold_points": "1 point per 2 remaining gold (round down)",
    },
    "patchwork": {
        "button_income": "Total buttons (currency) remaining at game end",
        "empty_penalty": "Negative: -2 points per empty space on your quilt board",
        "bonus_tile": "7 bonus points for first to complete a 7x7 area",
    },
    "photosynthesis": {
        "scoring_tokens": "Points from collected scoring tokens (trees returned to soil)",
    },
    "power-grid": {
        "cities_powered": "Count of cities you can power in the final round",
    },
    "quacks-of-quedlinburg": {
        "flask_position": "Points based on your droplet position on the track",
        "rubies": "1 point per ruby token collected",
        "rat_tokens": "Points from rat tails bonus tokens",
    },
    "root": {
        "victory_points": "Points from faction-specific scoring actions",
        "dominance_card": "Win by dominance if condition met instead of 30 VP",
    },
    "sagrada": {
        "public_objectives": "Points from public objective cards (rows, columns, sets)",
        "private_objective": "Points from your private color objective",
        "favor_tokens": "Points from remaining favor tokens",
        "empty_penalty": "Negative: -1 point per empty space on your window",
    },
    "seven-wonders": {
        "military": "Points from military conflict victories and defeats",
        "treasury": "1 point per 3 coins at game end",
        "wonder_stages": "Points printed on completed wonder stages",
        "civilian": "Points from blue civilian structure cards",
        "science": "Points from sets and groups of science symbols",
        "commerce": "Points from yellow commercial structure cards",
        "guilds": "Points from purple guild cards based on neighbors",
    },
    "sheriff-of-nottingham": {
        "legal_goods": "Points from legal goods in your merchant stand",
        "contraband": "Points from smuggled contraband goods",
        "king_queen": "Bonus for most/second-most of each legal good type",
        "gold_points": "1 point per gold coin remaining",
    },
    "splendor": {
        "card_points": "Points printed on purchased development cards",
        "noble_points": "3 points per noble tile earned from gem collections",
    },
    "sushi-go-party": {
        "round_points": "Total points scored across all three rounds",
    },
    "takenoko": {
        "plot_cards": "Points from completed plot pattern objective cards",
        "gardener_cards": "Points from completed gardener growth objectives",
        "panda_cards": "Points from completed panda eating objective cards",
        "emperor_bonus": "2 bonus points for completing the most objectives",
    },
    "telestrations": {
        "correct_guesses": "Points when your original word survives to the end",
        "funny_moments": "Bonus points voted by group for funniest drawings",
    },
    "terraforming-mars": {
        "tr_points": "Points from your Terraform Rating track position",
        "award_points": "Points from funded awards (5 first, 2 second place)",
        "milestone_points": "5 points per claimed milestone",
        "greenery_points": "1 point per greenery tile on Mars",
        "city_points": "1 point per adjacent greenery for each city",
        "card_points": "Victory points printed on played project cards",
    },
    "viticulture": {
        "victory_points": "Points from filling wine orders and visitor cards",
    },
}

files = sorted(os.listdir(scores_dir))
updated = 0
for f in files:
    path = os.path.join(scores_dir, f)
    d = json.load(open(path, encoding="utf-8"))
    game_id = d.get("game_id", f.replace("-score.json", ""))
    cats = d.get("categories", [])
    needs_update = any(not c.get("description") for c in cats)

    if not needs_update:
        continue

    game_descs = DESCRIPTIONS.get(game_id, {})
    for c in cats:
        if not c.get("description"):
            desc = game_descs.get(c.get("id", ""))
            if not desc:
                label = c.get("label", "Unknown")
                ptype = c.get("type", "manual")
                pts = c.get("points_each", 1)
                if ptype == "count" and pts:
                    desc = f"{pts} point(s) per {label.lower()}"
                elif ptype == "boolean" and pts:
                    desc = f"{pts} points if achieved"
                else:
                    desc = f"Points from {label.lower()}"
            c["description"] = desc

    stype = d.get("scoring_type", "")
    if stype == "cooperative" and not d.get("win_description"):
        d["win_description"] = "All players win or lose together"
        d["scoring_note"] = "Cooperative game -- track progress as a team"
    elif stype == "elimination" and not d.get("win_description"):
        d["win_description"] = "Last player standing wins"
    elif stype == "team_race" and not d.get("win_description"):
        d["win_description"] = "First team to complete the objective wins"

    with open(path, "w", encoding="utf-8") as fp:
        json.dump(d, fp, indent=2, ensure_ascii=False)
    updated += 1

print(f"Updated {updated} score configs with descriptions")

# Verify
missing_after = 0
for f in files:
    d = json.load(open(os.path.join(scores_dir, f), encoding="utf-8"))
    cats = d.get("categories", [])
    no_desc = [c for c in cats if not c.get("description")]
    if no_desc:
        missing_after += 1
        print(f"  Still missing: {f}")
print(f"Configs still missing descriptions: {missing_after}")
