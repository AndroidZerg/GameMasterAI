import sys, json

sys.stdout.reconfigure(encoding='utf-8')
t = json.load(open('content/teaching/obsession.json', encoding='utf-8'))

# 1. Add strategy section
t['sections']['strategy'] = {
    'walkthrough': [
        {
            'step': 1, 'title': 'The Servant Economy Is Everything',
            'text': "Here is the single most important thing to understand about Obsession. You are going to run out of servants constantly. When you use a servant for an activity, they go to Expended Service. Next turn, they move to Servants' Quarters. The turn after that, they finally come back to Available Service. That is a two-round cooldown. Your Butler and Housekeeper are needed for almost every activity, so plan two turns ahead. The whole puzzle of this game is making sure the right servants are available when you need them.",
            'image': None, 'image_caption': None
        },
        {
            'step': 2, 'title': 'Your First Priority: More Servants',
            'text': "In your first few turns, you want to get more servants as fast as possible. Butler's Room lets you hire 2 servants from the Servants for Hire supply. Butler's Pantry is one of the best tiles in the game because it gives you an Underbutler permanently. An Underbutler can substitute for a Butler, Valet, or Footman, which is incredibly flexible. Make buying Butler's Pantry your top priority whenever it appears in the market.",
            'image': None, 'image_caption': None
        },
        {
            'step': 3, 'title': 'Generate Money with Bowling Green',
            'text': "You need coins to buy improvement tiles, and you want to buy at least one tile almost every round. Bowling Green is your starting money engine. Use it early and often to fund your purchases. Quick heads up: most new players underestimate how fast their money runs out. If you find yourself short on cash, you can trade 2 reputation for 100 coins as a special action. Just do not do it too often because reputation is also valuable.",
            'image': None, 'image_caption': None
        },
        {
            'step': 4, 'title': 'Reputation Scales Dramatically',
            'text': "The reputation scoring table is not linear. Level 1 earns you only 1 victory point. Level 3 earns 6. Level 5 earns 15. And Max earns 28. That jump from level 3 to level 5 is worth 9 extra points. Reputation climbs naturally when you host activities and gain lion rampant icons. The best way to build reputation is just to host good activities consistently, not to chase it with special actions.",
            'image': None, 'image_caption': None
        },
        {
            'step': 5, 'title': 'Watch the Theme Cards for Courtship',
            'text': "Each season's courtship scores based on the theme category revealed at the start of that season. If the theme card shows Sporting tiles and you have been building in that category, you will win the courtship and get a Fairchild card. Fairchild cards are worth up to 8 victory points at the final courtship, so winning even one courtship is a big deal. If you see which theme is coming, buy tiles in that category to position yourself.",
            'image': None, 'image_caption': None
        },
        {
            'step': 6, 'title': 'Passing Is Powerful',
            'text': "New players often feel bad about passing, but it is one of the strongest moves in the game. When you pass, all your servants instantly return to Available Service. That is a complete reset. You also get your entire discard pile back into your active hand, and you either collect 200 coins or refresh the Builders' Market for free. Plus you can still buy a tile. The best players time their passes strategically, setting up a massive hosting turn on their next action.",
            'image': None, 'image_caption': None
        },
        {
            'step': 7, 'title': 'Flip Your Black Rose Tiles Early',
            'text': "Some of your starting tiles and purchased tiles have a black rose on one side. The first time you use that tile for an activity, it flips to its permanent front side, often unlocking better rewards or different category placement. You want to flip these as early as possible so you can benefit from their improved side for the rest of the game. Private Study in particular becomes very valuable once flipped, granting you 2 reputation and 300 coins during Village Fair rounds.",
            'image': None, 'image_caption': None
        },
        {
            'step': 8, 'title': 'Main Gazebo Gets You Prestige Guests',
            'text': "Main Gazebo is one of your starting tiles and it is one of the best tiles in the game for one reason: it draws Prestige Guests. Prestige guests have the highest victory point values in the game, ranging from 2 to 6 VP each. Every time you host at Main Gazebo, you are building your end-game scoring hand. Use it whenever you need to refill your hand with high-value guests.",
            'image': None, 'image_caption': None
        },
        {
            'step': 9, 'title': 'Adding Upstairs, Downstairs',
            'text': "If you are playing with the Upstairs, Downstairs expansion, here is what changes strategically. The Head Housemaid can substitute for any female servant, which makes the Lady's Maid bottleneck much less punishing. You can also hire servants when you pass your turn, making passing even more powerful. The Cook opens up new activity options for the Howard family. Overall, the expansion gives you more flexibility, which means you can host more demanding activities earlier in the game.",
            'image': None, 'image_caption': None
        },
        {
            'step': 10, 'title': 'Adding Wessex and Putting It All Together',
            'text': "If you are playing with the Wessex expansion, the Wessex family gets a head start with a choice of Breakfast Room or Tennis Court as an extra starting tile. Use that bonus tile aggressively in the early rounds. For all families, the expanded guest decks from both expansions add variety, so adjust your strategy to the guests you actually draw rather than planning around specific cards. Here is your overall game plan for your first play: focus on getting more servants and money in rounds 1 through 4, build tiles that match the theme card in rounds 5 through 10, and race for reputation and courtship wins in the final rounds. Most importantly, have fun running your estate. The Victorian theme and the storytelling on the cards make every game feel like an episode of Downton Abbey.",
            'image': None, 'image_caption': None
        }
    ],
    'summary': [
        {'step': 1, 'title': 'The Servant Economy Is Everything', 'bullets': ['Servants have a 2-round cooldown: Expended -> Quarters -> Available', 'Butler and Housekeeper needed for nearly every activity', 'Plan servant assignments 2 turns ahead'], 'image': None},
        {'step': 2, 'title': 'Your First Priority: More Servants', 'bullets': ["Butler's Room hires 2 servants from For Hire supply", "Butler's Pantry = Underbutler (subs for Butler/Valet/Footman)", 'Top purchase priority whenever available'], 'image': None},
        {'step': 3, 'title': 'Generate Money with Bowling Green', 'bullets': ['Bowling Green is your starting money engine', 'Buy a tile nearly every round; need steady income', 'Emergency: trade 2 reputation for 100 coins (use sparingly)'], 'image': None},
        {'step': 4, 'title': 'Reputation Scales Dramatically', 'bullets': ['Level 1 = 1 VP; Level 3 = 6 VP; Level 5 = 15 VP; Max = 28 VP', 'Best gained through consistent activity hosting', 'Do not sacrifice servants or tiles to chase reputation increments'], 'image': None},
        {'step': 5, 'title': 'Watch the Theme Cards for Courtship', 'bullets': ["Each season's courtship scores tiles in the revealed theme category", 'Winning courtship = Fairchild card (up to 8 VP at final courtship)', 'Buy tiles in the current theme category to position for courtship'], 'image': None},
        {'step': 6, 'title': 'Passing Is Powerful', 'bullets': ['All servants reset to Available; discard pile returns to hand', 'Gain 200 coins or free market refresh; can still buy tiles', 'Time passes to set up strong hosting turns'], 'image': None},
        {'step': 7, 'title': 'Flip Your Black Rose Tiles Early', 'bullets': ['Black rose tiles flip once when first used to unlock better side', 'Private Study flipped: 2 reputation + 300 coins during Village Fair rounds', 'Flip early to maximize remaining game benefit'], 'image': None},
        {'step': 8, 'title': 'Main Gazebo Gets You Prestige Guests', 'bullets': ['Draws Prestige Guests (2-6 VP each)', 'Best tile for building your end-game scoring hand', 'Use whenever you need high-value guest cards'], 'image': None},
        {'step': 9, 'title': 'Adding Upstairs, Downstairs', 'bullets': ['Head Housemaid substitutes for any female servant (reduces bottleneck)', 'Hiring while passing makes passing even more strategic', 'Cook opens new activities for Howard family; more flexibility overall'], 'image': None},
        {'step': 10, 'title': 'Adding Wessex and Putting It All Together', 'bullets': ['Wessex family: extra starting tile (Breakfast Room or Tennis Court)', 'Expanded guest decks add variety; adapt to what you draw', 'Game plan: servants/money early, theme tiles mid-game, reputation/courtship late'], 'image': None}
    ]
}

# 2. Fix appendix categories array
entries = t['sections']['appendix']['entries']
unique_cats = sorted(set(e.get('category', '') for e in entries))

# 3. Add expansion entries to appendix
expansion_entries = [
    {'term': 'Cook (Upstairs, Downstairs)', 'definition': 'New servant type added by the Upstairs, Downstairs expansion. Starting servant for the Howard family. Provides unique service options for new improvement tiles.', 'category': 'Servants'},
    {'term': 'Hall Boy (Upstairs, Downstairs)', 'definition': 'New servant type from Upstairs, Downstairs. A flexible male servant who can provide supplemental service on activities.', 'category': 'Servants'},
    {'term': 'Head Housemaid (Upstairs, Downstairs)', 'definition': 'New servant type from Upstairs, Downstairs. Can deputise for any female servant type, making her extremely versatile for activities requiring Lady\'s Maids.', 'category': 'Servants'},
    {'term': 'Useful Man (Upstairs, Downstairs)', 'definition': 'New servant type from Upstairs, Downstairs. A versatile servant that expands service options with specific deployment rules.', 'category': 'Servants'},
    {'term': 'Howard Family', 'definition': 'New family from the Upstairs, Downstairs expansion. Starts with a Cook servant, giving unique early access to Cook-required activities.', 'category': 'Families'},
    {'term': 'Wessex Family', 'definition': 'New family from the Wessex expansion. Starts with choice of Breakfast Room or Tennis Court as an additional level 2 starting improvement, giving a larger starting estate.', 'category': 'Families'},
    {'term': 'Supplemental Service', 'definition': 'Upstairs, Downstairs mechanic. New servant types can provide supplemental service on activities, expanding what you can accomplish during an activity beyond base requirements.', 'category': 'Core Mechanics'},
    {'term': 'Hiring While Passing', 'definition': 'Upstairs, Downstairs rule. When passing your turn, you may hire servants from the Servants For Hire supply in addition to base game passing benefits.', 'category': 'Core Mechanics'},
    {'term': 'Milestones', 'definition': 'Upstairs, Downstairs feature. Achievement-based goals that provide rewards or recognition during gameplay.', 'category': 'Core Mechanics'},
    {'term': 'Morning Room', 'definition': 'New improvement tile from the Wessex expansion (2nd edition). Adds variety to the tile pool.', 'category': 'Tiles'},
    {'term': 'Retiring Room', 'definition': 'New improvement tile from the Wessex expansion (2nd edition). Adds variety to the tile pool.', 'category': 'Tiles'},
    {'term': 'Business Room', 'definition': 'New improvement tile from the Upstairs, Downstairs expansion. Adds new hosting options.', 'category': 'Tiles'},
    {'term': 'Solo Estate Challenge', 'definition': 'Solo game mode added by Upstairs, Downstairs. An enhanced solo play variant.', 'category': 'Variants'},
    {'term': 'Tableau Obsession', 'definition': 'Game mode added by Upstairs, Downstairs. Alternative scoring and play focus variant.', 'category': 'Variants'},
    {'term': 'Cooperative Obsession', 'definition': 'Game mode added by Upstairs, Downstairs. Players work together against the game.', 'category': 'Variants'}
]
t['sections']['appendix']['entries'].extend(expansion_entries)

# Re-compute categories after adding expansion entries
all_cats = sorted(set(e.get('category', '') for e in t['sections']['appendix']['entries']))
t['sections']['appendix']['categories'] = all_cats

# Write the updated file
with open('content/teaching/obsession.json', 'w', encoding='utf-8') as f:
    json.dump(t, f, indent=2, ensure_ascii=False)

# Verify
t2 = json.load(open('content/teaching/obsession.json', encoding='utf-8'))
for section in ['setup', 'rules', 'strategy']:
    sv = t2['sections'][section]
    wt = len(sv.get('walkthrough', []))
    sm = len(sv.get('summary', []))
    print(f'{section}: {wt}W/{sm}S')
ae = t2['sections']['appendix']
print(f'appendix: {len(ae["entries"])} entries, {len(ae["categories"])} categories')
print(f'categories: {ae["categories"]}')
print('DONE')
