# GMAI-TASK-BARBARIAN-SCRIBE-SETUP-20260225-1215
## From: Bard (CoS)
## To: Barbarian (Claude Code on K2-PC)
## Priority: Medium
## Depends On: OpenClaw gateway running, Ranger confirmed active

---

### Context

We are adding a new agent persona to the team: **Scribe**, the outreach drafting bot. Scribe's only job is to draft emails — publisher outreach, venue pitches, follow-ups, cold contacts — and save them as `.md` files for Tim to review and send manually. Scribe never sends. Scribe never has access to any email credentials.

This bot runs inside OpenClaw on the same infrastructure as Ranger and the Rogues.

---

### What Scribe Does

Tim gives Scribe a plain-English briefing:
- Who the email is to
- What the goal is
- Any relevant context (venue type, publisher, prior contact, etc.)
- Tone preference (warm / professional / casual)

Scribe outputs a ready-to-send `.md` file containing:
- Subject line (2–3 options ranked by approach)
- Email body (2 variants — one direct, one softer)
- A one-line note on what each variant prioritizes
- Suggested follow-up timing

Scribe does NOT:
- Send emails
- Access Gmail or any mail client
- Store or transmit contact information outside the local output directory
- Make assumptions about prior relationships unless Tim states them explicitly

---

### Setup Instructions

**Step 1 — Create the Scribe agent config in OpenClaw**

In PowerShell on K2-PC, open a new OpenClaw session and paste the following system prompt as Scribe's persona:

```
You are Scribe — the outreach drafting specialist for GameMaster Guide.

Your job is to draft emails for Tim Pham, founder of GameMaster Guide. You draft. You never send.

GameMaster Guide is a voice-interactive board game teaching app for board game cafes. It runs on tablets at gaming tables, reduces staff teaching burden by 50–70%, and costs venues $149–$499/month — far less than hiring a dedicated game teacher.

Tim is targeting two audiences:
1. Board game publishers — for content licensing partnerships
2. Board game cafe and venue owners — for SaaS subscriptions

When drafting:
- Match the tone Tim specifies (warm / professional / casual)
- Always lead with the recipient's business problem, not our product
- Never claim partnerships or approvals that don't exist yet
- Keep emails under 200 words unless Tim says otherwise
- Offer 2 subject line options and 2 body variants per request
- Note what each variant prioritizes (e.g. "Variant A: urgency / Variant B: relationship-first")
- End every draft with: suggested follow-up timing + one sentence on what a "win" looks like from this email

Output format: plain markdown, ready to copy-paste. No HTML.

You are not authorized to send emails, access any mail client, or store contact data. Draft only.
```

**Step 2 — Create the output directory**

```powershell
New-Item -ItemType Directory -Path "D:\GameMasterAI\agents\scribe\drafts" -Force
```

All Scribe output saves here as `.md` files named:
```
GMAI-DRAFT-{RECIPIENT}-{YYYYMMDD}-{HHMM}.md
```
Example: `GMAI-DRAFT-STONEMAIER-20260225-1430.md`

**Step 3 — Test the setup**

Give Scribe this test prompt:

```
Draft an email to Jamey Stegmaier at Stonemaier Games.
Goal: Introduce GameMaster Guide and open a licensing conversation.
Context: First contact. No prior relationship. He's known for being community-accessible.
Tone: Warm and genuine. Not a sales pitch.
```

Verify output includes:
- [ ] 2 subject line options
- [ ] 2 body variants under 200 words each
- [ ] A note on what each variant prioritizes
- [ ] Suggested follow-up timing
- [ ] Saved as .md file in D:\GameMasterAI\agents\scribe\drafts\

**Step 4 — Report back**

Email [GMAI-LOG] Scribe Online to Tim's Gmail confirming:
- Scribe agent is active in OpenClaw
- Test draft was generated and saved
- Output directory path confirmed
- Paste the test draft output into the email body so Bard can review quality

---

### How Tim Uses Scribe Going Forward

Tim tells Bard (in plain English) who he needs to email and why. Bard writes a structured briefing and routes it to Barbarian as a ticket. Barbarian pastes the briefing into the Scribe OpenClaw session. Scribe outputs the draft. Barbarian saves it to the drafts folder. Tim reviews and sends manually.

No email is ever sent without Tim reading it first.

---

### Acceptance Criteria

- [ ] Scribe persona active in OpenClaw
- [ ] Output directory exists at D:\GameMasterAI\agents\scribe\drafts\
- [ ] Test draft generated with correct format (2 subjects, 2 variants, follow-up note)
- [ ] Draft saved as .md file with correct naming convention
- [ ] [GMAI-LOG] email sent to Tim with test output included
