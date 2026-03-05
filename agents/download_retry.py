"""
Retry download for games that failed in first run.
Reads from pdf_manifest_retry.json, same extraction logic.
"""
import urllib.request, os, json, subprocess, sys, io, time, ssl

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)

os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
os.makedirs("content/rulebooks", exist_ok=True)
os.makedirs("content/rulebook-text", exist_ok=True)

with open("agents/pdf_manifest_retry.json") as f:
    manifest = json.load(f)

# Create an SSL context that doesn't verify (some sites have expired certs)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def extract_text(gid, title, source):
    pdf_path = f"content/rulebooks/{gid}.pdf"
    txt_path = f"content/rulebook-text/{gid}.txt"

    # Try pdftotext
    subprocess.run(["pdftotext", "-layout", pdf_path, txt_path], capture_output=True)
    if os.path.exists(txt_path) and os.path.getsize(txt_path) > 500:
        with open(txt_path, 'r', encoding='utf-8', errors='ignore') as fh:
            content = fh.read()
        with open(txt_path, 'w', encoding='utf-8') as fh:
            fh.write(f"# {title} -- Rulebook Text\n# Source: {source}\n# Extracted: 2026-03-05\n\n{content}")
        return True

    # Fallback to pdfminer
    try:
        from pdfminer.high_level import extract_text as pdfminer_extract
        text = pdfminer_extract(pdf_path)
        if len(text) > 500:
            with open(txt_path, 'w', encoding='utf-8') as fh:
                fh.write(f"# {title} -- Rulebook Text\n# Source: {source}\n# Extracted: 2026-03-05 (pdfminer)\n\n{text}")
            return True
    except Exception as e:
        print(f"  pdfminer failed: {e}")

    return False


found = []
missing = []

total = len(manifest)
for i, (gid, info) in enumerate(manifest.items()):
    title = info.get("title", gid)
    url = info.get("url", "")

    if not url:
        print(f"[{i+1}/{total}] MISSING {title} -- no URL")
        missing.append({"game_id": gid, "title": title, "reason": "No PDF URL found"})
        continue

    print(f"[{i+1}/{total}] Downloading: {title}")
    pdf_path = f"content/rulebooks/{gid}.pdf"

    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        resp = urllib.request.urlopen(req, timeout=30, context=ctx)
        data = resp.read()
        content_type = resp.headers.get('Content-Type', '')

        if len(data) < 5000:
            print(f"  SKIP -- too small ({len(data)} bytes)")
            missing.append({"game_id": gid, "title": title, "reason": f"Download too small: {len(data)} bytes"})
            continue

        if data[:5] != b'%PDF-' and 'pdf' not in content_type.lower():
            print(f"  SKIP -- not a PDF (type: {content_type})")
            missing.append({"game_id": gid, "title": title, "reason": f"Not a PDF: {content_type}"})
            continue

        with open(pdf_path, 'wb') as f:
            f.write(data)
        print(f"  Downloaded {len(data)//1024}KB")

    except Exception as e:
        print(f"  Download failed: {e}")
        missing.append({"game_id": gid, "title": title, "reason": f"Download error: {e}", "url": url})
        continue

    # Extract text
    if extract_text(gid, title, url):
        found.append({"game_id": gid, "title": title, "source": url})
        print(f"  Text extracted OK")
    else:
        missing.append({"game_id": gid, "title": title, "reason": "PDF downloaded but text extraction failed", "url": url})
        print(f"  Text extraction FAILED")

    time.sleep(0.5)


# Final report
print(f"\n{'='*60}")
print(f"RETRY RESULTS")
print(f"{'='*60}")
print(f"Found + extracted: {len(found)}")
print(f"Still missing: {len(missing)}")
if missing:
    print(f"\n--- Still Missing ---")
    for m in missing:
        print(f"  {m['title']} -- {m['reason']}")
if found:
    print(f"\n--- Newly Extracted ---")
    for f_item in found:
        print(f"  {f_item['title']}")

print("\nDone!")
