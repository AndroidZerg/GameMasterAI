import json
import sys

def fix_json_quotes(content):
    """Fix unescaped double quotes inside JSON string values."""
    result = []
    i = 0
    in_string = False
    escape_next = False

    while i < len(content):
        ch = content[i]

        if escape_next:
            result.append(ch)
            escape_next = False
            i += 1
            continue

        if ch == "\\":
            result.append(ch)
            escape_next = True
            i += 1
            continue

        if ch == '"':
            if not in_string:
                in_string = True
                result.append(ch)
            else:
                # Check if this is a legitimate string close
                rest = content[i+1:].lstrip()
                if rest and rest[0] in (',', '}', ']', ':'):
                    in_string = False
                    result.append(ch)
                elif not rest:
                    in_string = False
                    result.append(ch)
                else:
                    # Unescaped quote inside string - escape it
                    result.append('\\"')
            i += 1
            continue

        result.append(ch)
        i += 1

    return ''.join(result)

games = ['dominion', 'everdell', 'above-and-below', 'castles-of-burgundy', 'century-spice-road',
         'concordia', 'codenames', 'lords-of-waterdeep', 'king-of-tokyo']

for g in games:
    path = f'D:/GameMasterAI/content/games/{g}.json'
    with open(path, encoding='utf-8') as f:
        raw = f.read()

    fixed = fix_json_quotes(raw)

    try:
        d = json.loads(fixed)
        tabs = d.get('tabs', {})
        s = len(tabs.get('setup', {}).get('subtopics', []))
        r = len(tabs.get('rules', {}).get('subtopics', []))
        st = len(tabs.get('strategy', {}).get('subtopics', []))

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)

        print(f'{g}: FIXED - setup={s} rules={r} strategy={st}')
    except json.JSONDecodeError as e:
        print(f'{g}: STILL BROKEN - {e}')
