"""Fix Stonemaier game content to match Wingspan's complete tab structure.

Issues found:
- Charterstone: setup has 1 subtopic (needs 3+), missing walkthrough + advanced_strategy
- 10 games missing advanced_strategy tab
- All games should have: setup, rules, strategy, walkthrough, advanced_strategy
"""

import json
from pathlib import Path

GAMES_DIR = Path(__file__).resolve().parents[1] / "content" / "games"
REQUIRED_TABS = {"setup", "rules", "strategy", "walkthrough", "advanced_strategy"}


# ── Charterstone setup split ─────────────────────────────────────────────
# Split single "What's in the Box" into 3 subtopics
CHARTERSTONE_SETUP = [
    {
        "id": "components",
        "title": "Components & Materials",
        "content": (
            "#### Board & Shared Components\n"
            "- 1 double-sided game board with 6 charter areas (sections) surrounding a central commons area\n"
            "- 1 index with 36 numbered cards stored in a card archive box\n"
            "- 6 charter boxes (one per player/charter), each sealed with unique starting stickers and components\n"
            "- 1 progress track board for tracking game-to-game campaign progress\n"
            "- Crate tokens (numbered containers that unlock new content when opened)\n\n"
            "#### Per-Player Components\n"
            "- 2 wooden worker meeples in your charter's color\n"
            "- 1 wooden VP marker\n"
            "- 1 wooden reputation marker\n"
            "- 1 wooden influence token\n"
            "- Starting resource cards and coins\n"
            "- A charter box containing your unique starting stickers\n\n"
            "#### Legacy Materials\n"
            "- 30+ minion tokens (generic workers for unoccupied charters)\n"
            "- Sealed tuck boxes and card packs revealed as the campaign progresses\n"
            "- Sticker sheets that permanently modify the game board\n"
            "- The game board itself evolves — buildings you construct are stickered onto the board permanently"
        ),
    },
    {
        "id": "first-game-setup",
        "title": "First Game Setup",
        "content": (
            "#### Before Your First Game\n"
            "1. Punch out all tokens and sort them into labeled bags\n"
            "2. Place the game board in the center of the table (use Side 1 for the campaign)\n"
            "3. Each player selects a charter (1–6) and takes the matching charter box\n"
            "4. Open your charter box — apply only the stickers marked \"Game 1\" to your charter area\n"
            "5. Place 1 worker on your charter's starting building\n"
            "6. Keep your second worker in reserve\n\n"
            "#### Initial Resources\n"
            "- Each player starts with a set of basic resources (coins, pumpkins, etc.) as shown on their charter card\n"
            "- Place your VP marker on 10 on the score track\n"
            "- Place your reputation marker on the center of the reputation track\n"
            "- Unused charters get 2 minion workers placed on their starting buildings\n\n"
            "#### Important First-Game Notes\n"
            "- Do NOT open any sealed content until instructed\n"
            "- Read the campaign guide's \"Game 1\" section aloud\n"
            "- The index cards (numbered 1–36) are referenced throughout — only look up a card when directed"
        ),
    },
    {
        "id": "game-structure",
        "title": "Game Structure & Flow",
        "content": (
            "#### Campaign Structure\n"
            "Charterstone is a 12-game legacy campaign. Each game takes 45–75 minutes. Between games, new content is unlocked, "
            "buildings are permanently added to the board, and the village evolves based on player decisions.\n\n"
            "#### Single Game Flow\n"
            "Each game follows this pattern:\n"
            "1. **Setup**: Apply any new stickers, read the campaign guide entry, set starting resources\n"
            "2. **Play**: Take turns placing workers on buildings to gain resources, construct new buildings, and advance objectives\n"
            "3. **Trigger End**: The game ends when a set number of buildings have been constructed or a specific condition is met\n"
            "4. **Score**: Tally VP from buildings, reputation, influence, guideposts (objectives), and special bonuses\n"
            "5. **Between Games**: Open crates earned, apply permanent changes, record scores on the campaign progress track\n\n"
            "#### Player Interaction\n"
            "- You can place workers in ANY charter area, not just your own\n"
            "- Building in another player's charter gives them a small bonus\n"
            "- The commons area has neutral buildings anyone can use\n"
            "- Reputation and influence tracks create indirect competition"
        ),
    },
]


# ── Missing walkthrough content ──────────────────────────────────────────
WALKTHROUGHS = {
    "charterstone": {
        "subtopics": [
            {
                "id": "first-game-walkthrough",
                "title": "First-Game Walkthrough",
                "content": (
                    "#### Your First Game of Charterstone — A Guided Walkthrough\n\n"
                    "**Setup**: Each player opens their charter box and applies the Game 1 stickers. Place one worker on your "
                    "starting building, keep the second in reserve. Start with 10 VP and basic resources.\n\n"
                    "**Early Turns (1–5)**\n"
                    "- Use your starting building to collect basic resources (pumpkins, coins, wood)\n"
                    "- Visit the commons buildings for additional actions\n"
                    "- Start saving resources for your first construction\n\n"
                    "**Mid-Game (6–12)**\n"
                    "- Construct your first building — choose a card from your hand and pay its resource cost\n"
                    "- Place the building sticker in your charter area (this is permanent!)\n"
                    "- Consider building in other players' charters for tactical advantage\n"
                    "- Start working toward guideposts (objectives) for bonus VP\n\n"
                    "**Late Game (13–end)**\n"
                    "- Focus on scoring: construct high-VP buildings, complete guideposts\n"
                    "- Use the reputation track — higher reputation = more points\n"
                    "- Don't hoard resources; convert everything to VP before the game ends\n\n"
                    "**After Game 1**\n"
                    "- Open any earned crates and follow the instructions inside\n"
                    "- Record scores on the progress track\n"
                    "- The losing player(s) get a small catch-up bonus for Game 2\n"
                    "- New rules and buildings will be introduced — the game gets richer each session"
                ),
            }
        ]
    },
}


# ── Missing advanced_strategy content ────────────────────────────────────
ADVANCED_STRATEGIES = {
    "charterstone": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### Campaign-Level Thinking\n\n"
                    "**Building Placement is Permanent**: Every building you place stays for all 12 games. Think about which "
                    "buildings create the best engine for future games, not just the current one. A building that generates "
                    "pumpkins might win Game 3 but be useless in Games 8–12.\n\n"
                    "#### Charter Territory Control\n\n"
                    "**Fill Your Charter First**: Buildings in your charter give you a bonus whenever other players visit. "
                    "Having 5 strong buildings means opponents feed you resources every time they use your area. Prioritize "
                    "buildings with broadly useful effects (resource generation, card draw).\n\n"
                    "#### Reputation vs. Influence\n\n"
                    "**Reputation** gives end-game VP and ongoing bonuses — high reputation players score more from guideposts. "
                    "**Influence** determines turn order and breaks ties. In close games, the influence track winner has a "
                    "huge advantage. Balance both but lean toward reputation early.\n\n"
                    "#### Crate Optimization\n\n"
                    "Crates unlock new content and powerful cards. Earning crates earlier means more games with that content. "
                    "If a guidepost awards a crate, prioritize it over raw VP.\n\n"
                    "#### Adaptation\n\n"
                    "The game evolves. Strategies that worked in Games 1–4 may be obsolete by Game 8. Stay flexible, "
                    "read new cards carefully, and be willing to shift your engine when new mechanics appear."
                ),
            }
        ]
    },
    "euphoria-build-a-better-dystopia": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### Knowledge Management\n\n"
                    "**The Knowledge Trap**: High knowledge lets your workers act more efficiently, but exceed the threshold "
                    "and they 'wake up' and leave. Keep knowledge at 4–5: high enough to use powerful spaces but below the "
                    "escape threshold. Bump other players' knowledge to steal their workers.\n\n"
                    "#### Morale Optimization\n\n"
                    "High morale gives you more cards (ethical dilemma cards) which provide powerful one-time effects. "
                    "Investing early in morale means more options mid-game.\n\n"
                    "#### Faction Strategies\n\n"
                    "**Euphorians** excel at artifact generation. **Wastelanders** dominate resource production. "
                    "**Subterrans** have the strongest tunnel networks. **Icarians** shine at knowledge manipulation. "
                    "Recruit pairs that synergize — two Euphorians can chain artifact effects.\n\n"
                    "#### Authority Placement\n\n"
                    "Place authority stars early on cheap territories to establish presence. The markets are powerful: "
                    "completing a market removes a game resource from ALL players. Time market completion to hurt opponents "
                    "more than yourself.\n\n"
                    "#### Worker Activation\n\n"
                    "Rolling doubles lets you activate an extra worker for free. With 3+ dice, the probability is significant. "
                    "Plan for doubles as a bonus, not a guarantee."
                ),
            }
        ]
    },
    "between-two-cities": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### The Partner Paradox\n\n"
                    "Your score equals your LOWER-scoring city. This means you need both cities to perform well — it's "
                    "useless to have a 60-point city and a 30-point city. Always invest in whichever city is weaker.\n\n"
                    "#### Tile Valuation\n\n"
                    "**Factories**: Scale with adjacency — cluster them. One isolated factory is worth 2 pts; four in a "
                    "block are worth 16+ pts total. **Shops**: Need all 4 types for maximum bonus. **Taverns**: "
                    "Set collection — 1/4/9/17 points for 1/2/3/4 unique types. **Houses**: Score based on OTHER "
                    "building types present, so they're strongest in diverse cities.\n\n"
                    "#### Draft Reading\n\n"
                    "Track what your neighbors are drafting. If left-neighbor is hoarding factories, feed their shared "
                    "city factories too (you both benefit). If right-neighbor ignores taverns, don't invest in taverns "
                    "for your shared city.\n\n"
                    "#### Duplex Strategy\n\n"
                    "Duplex tiles (placed across 2 spaces) are high-value but inflexible. Draft them early when you have "
                    "space to place them optimally. Late-game duplexes often end up in suboptimal positions.\n\n"
                    "#### The Kingmaker Position\n\n"
                    "In the final round, look at the scoreboard. If you can't win, choose tile placements that don't "
                    "kingmake a specific opponent. Balanced play earns trust for future games."
                ),
            }
        ]
    },
    "my-little-scythe": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### Trophy Rush vs. Slow Build\n\n"
                    "You need 4 trophies to win. **Rush strategy**: focus on the easiest trophies (deliver 2 pies, "
                    "win a fight, complete a quest) and race to 4 before opponents set up engines. **Slow build**: "
                    "accumulate resources, upgrade actions, then claim 3–4 trophies in rapid succession.\n\n"
                    "#### Friendship Track Mastery\n\n"
                    "The friendship track rewards peaceful play. Gaining friendship is easy (share apples/gems via "
                    "Move actions), and the friendship trophy is the easiest to claim. But friendship also determines "
                    "who gets the 'make a wish' bonus — the highest friendship player gets powerful one-time effects.\n\n"
                    "#### Pie Delivery Optimization\n\n"
                    "Pies require specific resource combinations. Plan your resource gathering to complete pies "
                    "efficiently — don't collect randomly. Castle delivery is safe but slow; frontier delivery is "
                    "faster but vulnerable to theft.\n\n"
                    "#### Combat Considerations\n\n"
                    "Fighting costs friendship but earns a trophy and steals resources. Time fights carefully — "
                    "attack when opponent is loaded with resources, and when you can absorb the friendship penalty. "
                    "Power-up cards are crucial: save them for decisive moments."
                ),
            }
        ]
    },
    "pendulum": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### Timer Mastery\n\n"
                    "Pendulum's real-time element means speed matters, but rushing causes mistakes. **Key insight**: "
                    "you don't have to act during every timer flip. Sometimes waiting for the right timer gives you "
                    "a better action than frantically placing workers.\n\n"
                    "#### Worker Specialization\n\n"
                    "The Grande worker ignores timer restrictions. Use it strategically on high-value actions that would "
                    "otherwise require waiting. Regular workers should fill consistent, repeatable action slots.\n\n"
                    "#### Province vs. Council Strategy\n\n"
                    "**Province cards** give ongoing passive bonuses — prioritize them early. **Council seats** give "
                    "powerful end-of-round actions. The best players balance both: provinces for the engine, council "
                    "for the scoring burst.\n\n"
                    "#### Scoring Track Focus\n\n"
                    "Three tracks (Military, Prestige, Popularity) but you only need to excel at two. Identify which "
                    "two tracks synergize with your starting character ability and commit. Spreading thin across all "
                    "three guarantees mediocrity.\n\n"
                    "#### Legendary Achievement Timing\n\n"
                    "Legendary achievements are powerful one-time bonuses. Race to complete them — once claimed by "
                    "another player, they're gone. Prioritize achievements that align with your chosen tracks."
                ),
            }
        ]
    },
    "red-rising": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### Hand Sculpting\n\n"
                    "Red Rising is fundamentally about building the perfect hand. Every deploy-and-draw decision should "
                    "ask: 'Does this improve my end-game hand?' A powerful card on the board is only useful if you can "
                    "retrieve it before the game ends.\n\n"
                    "#### Color Synergies\n\n"
                    "**Gold** cards score for set collection. **Silver** cards reward specific board positions. "
                    "**Obsidian** cards score for combat (helium). **Blue** cards score for influence. **Red** cards "
                    "are wildcards. Build your hand around 1–2 color synergies, not rainbow collection.\n\n"
                    "#### Location Mastery\n\n"
                    "Each location (Jupiter, Mars, Luna, The Institute) offers different card pools and bonuses. "
                    "**Jupiter** is best for Gold/Silver. **Mars** for Obsidian/combat. **Luna** for influence. "
                    "**The Institute** for flexibility. Specialize based on your hand direction.\n\n"
                    "#### Helium Timing\n\n"
                    "Helium advances you toward Sovereign and triggers the end game. Accelerate when you have a strong "
                    "hand; stall when you need more sculpting time. Watch opponents' helium — don't let someone end "
                    "the game when you're mid-build.\n\n"
                    "#### The Sovereign Bonus\n\n"
                    "Reaching Sovereign is worth significant points but costs resources. Only race to Sovereign if "
                    "your hand already scores well — a 60-point hand beats a 40-point hand with the Sovereign bonus."
                ),
            }
        ]
    },
    "rolling-realms": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### Realm Selection\n\n"
                    "Each round uses 3 realms from a pool. When choosing realms (in draft variants), pick realms that "
                    "synergize with each other. Some realms generate resources (stars, pumpkins) that fuel other realms. "
                    "Chain effects are the key to high scores.\n\n"
                    "#### Dice Allocation\n\n"
                    "Two community dice are rolled each round. The optimal play isn't always obvious — sometimes a '3' "
                    "on a realm that chains into stars is worth more than a '6' for raw points. Calculate the chain "
                    "value, not just the face value.\n\n"
                    "#### Resource Management\n\n"
                    "**Stars** are the universal currency — they modify dice or activate special abilities. Hoard stars "
                    "early, spend them in the final round for maximum impact. **Pumpkins** are realm-specific but often "
                    "convert to stars.\n\n"
                    "#### Round Pacing\n\n"
                    "3 rounds × 3 realms × 3 turns = 9 total dice placements per realm. The first realm you complete "
                    "each round gives a bonus. Prioritize completing realms that award stars/resources for reinvestment."
                ),
            }
        ]
    },
    "expeditions": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### Map Control\n\n"
                    "Expeditions is about exploring the board efficiently. **Key insight**: tiles closer to base camp "
                    "are safer but lower value. Push deep for high-value tiles, but plan your return path — you score "
                    "nothing if you can't get items back.\n\n"
                    "#### Card Engine Priorities\n\n"
                    "Your mech's upgrade cards define your strategy. **Movement upgrades** first (more efficient "
                    "exploration), then **combat** (to claim contested tiles), then **resource generation** (for the "
                    "end-game push). Don't upgrade evenly — specialize.\n\n"
                    "#### Worker Placement Timing\n\n"
                    "Workers on tiles claim them. Place workers early on contested tiles (near multiple players), "
                    "but delay placement on remote tiles that only you can reach. Workers are limited — every placement "
                    "is a commitment.\n\n"
                    "#### Corruption Management\n\n"
                    "Corruption cards clog your hand but are sometimes unavoidable. Spend actions to remove corruption "
                    "before it accumulates. Two corruption cards reduce your effective hand size significantly. "
                    "Prevention is better than cure — avoid actions that generate corruption when possible.\n\n"
                    "#### End-Game Trigger Awareness\n\n"
                    "The game ends when someone places their final worker or the tile stack depletes. Track both "
                    "conditions. If you're ahead, accelerate; if behind, delay by exploring new tiles instead of claiming."
                ),
            }
        ]
    },
    "apiary": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### Hibernation Timing\n\n"
                    "Sending bees to hibernation is Apiary's key decision. Hibernate too early and you lose actions; "
                    "too late and you miss the strength bonus from returning. **Optimal timing**: hibernate bees after "
                    "2–3 uses when their current strength offers diminishing returns.\n\n"
                    "#### Hive Building Strategy\n\n"
                    "Your hive mat has limited space. Prioritize tiles that create adjacency bonuses — two resource "
                    "tiles next to each other are worth more than two isolated tiles. Plan your hive layout before "
                    "you start filling it.\n\n"
                    "#### Queen Bee Powers\n\n"
                    "Your queen's unique ability defines your strategy. Lean into it hard — a queen that benefits "
                    "from exploration should explore aggressively. Don't fight your queen's strengths.\n\n"
                    "#### Resource Conversion Chains\n\n"
                    "Resources convert through specific chains (pollen → wax → honey). The conversion rate isn't 1:1, "
                    "so starting resources early lets you compound. Don't hoard raw resources when converting yields "
                    "better returns.\n\n"
                    "#### Dance Floor Competition\n\n"
                    "The dance floor is contested — stronger bees bump weaker ones. Time your dance floor visits "
                    "when you have high-strength bees. Getting bumped wastes your turn but gives the bumper a bonus. "
                    "Watch opponents' bee strength before committing."
                ),
            }
        ]
    },
    "between-two-castles-of-mad-king-ludwig": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### Castle Balance is Everything\n\n"
                    "Like Between Two Cities, your score is your LOWER castle. Never let one castle fall more than "
                    "10 points behind the other. If your left castle is struggling, prioritize it even if your right "
                    "castle could score more.\n\n"
                    "#### Room Synergy Chains\n\n"
                    "Rooms score based on adjacency and type. **Food rooms** (yellow) want to be near Sleeping rooms. "
                    "**Activity rooms** (red) score for unique types nearby. **Living rooms** (orange) want size. "
                    "**Utility rooms** (gray) are flexible connectors. **Outdoor rooms** (green) score for being on "
                    "ground level. Build clusters, not scattered rooms.\n\n"
                    "#### Throne Room Placement\n\n"
                    "Each castle has a throne room that scores for specific conditions. Identify these conditions "
                    "during setup and draft rooms that satisfy them. A 10-point throne room bonus often decides "
                    "the game.\n\n"
                    "#### Draft Signaling\n\n"
                    "In a 2-player collaboration, communication is limited to your drafting choices. If your partner "
                    "passes you food rooms, they're signaling the castle needs food rooms. Respond by continuing "
                    "that strategy. Fighting your partner's signals hurts both of you.\n\n"
                    "#### Basement and Towers\n\n"
                    "Basement rooms (below ground) and towers (above 2nd floor) are often overlooked but provide "
                    "unique scoring opportunities. Basements are especially powerful — fewer players compete for them."
                ),
            }
        ]
    },
    "libertalia-winds-of-galecrest": {
        "subtopics": [
            {
                "id": "advanced-strategy",
                "title": "Advanced Strategy",
                "content": (
                    "#### Reputation Track Manipulation\n\n"
                    "Reputation determines tiebreakers and powers for several crew. At 10+ reputation, certain crew "
                    "activate bonus abilities. **Key insight**: reputation swings are more valuable early in a voyage "
                    "because more crew resolve afterward.\n\n"
                    "#### Hand Reading\n\n"
                    "All players receive the same crew cards each voyage. Track which cards opponents have played — "
                    "if they played their Brute on Day 1, they can't play it again. In later days, you can predict "
                    "opponents' plays with increasing accuracy.\n\n"
                    "#### Loot Valuation\n\n"
                    "Not all loot is equal. **Maps** are worth 3 VP each — always good. **Treasure chests** scale "
                    "with collection (1/3/6/10). **Cursed relics** are -3 VP but sometimes worth taking to deny "
                    "opponents. **Sabers** give combat power. Value loot based on your current collection, not "
                    "absolute worth.\n\n"
                    "#### Day Order Manipulation\n\n"
                    "Crew with high rank numbers play first (choose better loot) but resolve LAST (night powers in "
                    "reverse). Low-rank crew pick loot last but their night powers resolve first. This duality is "
                    "key — sometimes you WANT to go last in the day to trigger your night power first.\n\n"
                    "#### Voyage Pacing\n\n"
                    "Each voyage has 4 days. Days 1–2 are for building position (reputation, safe loot). "
                    "Days 3–4 are for scoring (high-value loot, aggressive crew). Save your strongest crew for "
                    "the final days when the most valuable loot appears."
                ),
            }
        ]
    },
}


def fix_game(game_id: str, data: dict) -> bool:
    """Fix a single game's tab structure. Returns True if modified."""
    modified = False
    tabs = data.setdefault("tabs", {})

    # Fix Charterstone setup specifically
    if game_id == "charterstone":
        old_setup = tabs.get("setup", {}).get("subtopics", [])
        if len(old_setup) <= 1:
            tabs["setup"] = {"subtopics": CHARTERSTONE_SETUP}
            modified = True
            print(f"  [setup] Split 1 subtopic -> {len(CHARTERSTONE_SETUP)} subtopics")

    # Add missing walkthrough tab
    if "walkthrough" not in tabs and game_id in WALKTHROUGHS:
        tabs["walkthrough"] = WALKTHROUGHS[game_id]
        modified = True
        print(f"  [walkthrough] Added")

    # Add missing advanced_strategy tab
    if "advanced_strategy" not in tabs and game_id in ADVANCED_STRATEGIES:
        tabs["advanced_strategy"] = ADVANCED_STRATEGIES[game_id]
        modified = True
        print(f"  [advanced_strategy] Added")

    return modified


def validate_game(game_id: str, data: dict) -> list[str]:
    """Validate game matches Wingspan structure. Returns list of issues."""
    issues = []
    tabs = data.get("tabs", {})

    for tab_name in REQUIRED_TABS:
        tab = tabs.get(tab_name)
        if not tab:
            issues.append(f"Missing tab: {tab_name}")
            continue
        subs = tab.get("subtopics", [])
        if not subs:
            issues.append(f"Tab '{tab_name}' has no subtopics")
            continue
        for i, s in enumerate(subs):
            if not s.get("id"):
                issues.append(f"Tab '{tab_name}' subtopic {i} missing 'id'")
            if not s.get("title"):
                issues.append(f"Tab '{tab_name}' subtopic {i} missing 'title'")
            if not s.get("content", "").strip():
                issues.append(f"Tab '{tab_name}' subtopic {i} missing 'content'")

    return issues


def main():
    stonemaier = [
        "wingspan", "scythe", "viticulture", "charterstone", "tapestry",
        "euphoria-build-a-better-dystopia", "between-two-cities", "my-little-scythe",
        "pendulum", "red-rising", "rolling-realms", "expeditions", "apiary",
        "wyrmspan", "between-two-castles-of-mad-king-ludwig", "libertalia-winds-of-galecrest",
    ]

    total_fixed = 0
    total_issues = 0

    for game_id in stonemaier:
        path = GAMES_DIR / f"{game_id}.json"
        if not path.exists():
            print(f"ERROR: {game_id}.json not found!")
            total_issues += 1
            continue

        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"\n{game_id}:")

        modified = fix_game(game_id, data)
        issues = validate_game(game_id, data)

        if issues:
            for issue in issues:
                print(f"  WARNING: {issue}")
            total_issues += len(issues)

        if modified:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"  WRITTEN OK")
            total_fixed += 1
        else:
            print(f"  No changes needed")

    print(f"\n{'='*60}")
    print(f"Fixed: {total_fixed} games")
    print(f"Remaining issues: {total_issues}")

    # Final validation pass
    print(f"\nFinal validation:")
    for game_id in stonemaier:
        path = GAMES_DIR / f"{game_id}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        tabs = data.get("tabs", {})
        tab_info = []
        for t in ["setup", "rules", "strategy", "walkthrough", "advanced_strategy"]:
            count = len(tabs.get(t, {}).get("subtopics", []))
            tab_info.append(f"{t}:{count}")
        missing = REQUIRED_TABS - set(tabs.keys())
        status = "OK" if not missing else f"MISSING: {missing}"
        print(f"  {game_id}: {' | '.join(tab_info)} [{status}]")


if __name__ == "__main__":
    main()
