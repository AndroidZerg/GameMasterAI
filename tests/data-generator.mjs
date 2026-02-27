/**
 * GMAI Data Generator — 6 Bot Test Suite
 * Runs against LIVE site (playgmai.com) to generate analytics data.
 * Each bot simulates a different user persona across different venues.
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://playgmai.com';
const DELAY_MIN = 1200;
const DELAY_MAX = 3500;

function randomDelay() {
  return new Promise(r => setTimeout(r, DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN)));
}
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}
function log(bot, action) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] [Bot ${bot}] ${action}`);
}

// ── Helpers ──

async function login(page, email, password, bot) {
  log(bot, `Navigating to ${BASE_URL}`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await wait(2000);

  // Check if already on games page (previous session token)
  if (page.url().includes('/games')) {
    log(bot, 'Already on games page (cached session)');
    return;
  }

  log(bot, `Logging in as ${email}`);
  const emailInput = page.locator('input[aria-label="Email or username"]');
  const pwInput = page.locator('input[aria-label="Password"]');

  await emailInput.fill(email);
  await wait(500);
  await pwInput.fill(password);
  await wait(500);

  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/games**', { timeout: 20000 }).catch(() => {});
  await wait(3000);
  log(bot, `Logged in — URL: ${page.url()}`);
}

async function searchGame(page, query, bot) {
  log(bot, `Searching: "${query}"`);
  const input = page.locator('input[aria-label="Search games"]');
  await input.fill('');
  await input.type(query, { delay: 80 });
  await wait(2000);
}

async function clickFirstGameCard(page, bot) {
  // Game cards have role="button" and aria-label starting with "Play"
  const card = page.locator('div[role="button"][aria-label^="Play"]').first();
  const count = await card.count();
  if (count > 0) {
    const label = await card.getAttribute('aria-label');
    log(bot, `Clicking game card: ${label}`);
    await card.click();
    await wait(3000);
    return true;
  }
  log(bot, 'No game card found');
  return false;
}

async function switchTab(page, tabLabel, dwellSec, bot) {
  log(bot, `Switching to "${tabLabel}" tab (dwell ${dwellSec}s)`);
  // Tabs use role="tab" with aria-label like "Setup tab", "Rules tab", etc.
  const tab = page.locator(`button[role="tab"][aria-label="${tabLabel} tab"]`);
  const count = await tab.count();
  if (count > 0) {
    await tab.click();
    await wait(dwellSec * 1000);
  } else {
    // Fallback: try text match
    const fallback = page.locator(`button[role="tab"]`).filter({ hasText: tabLabel });
    if (await fallback.count() > 0) {
      await fallback.first().click();
      await wait(dwellSec * 1000);
    } else {
      log(bot, `  Tab "${tabLabel}" not found`);
    }
  }
}

async function askQuestion(page, question, bot) {
  log(bot, `Asking: "${question}"`);
  // Q&A input has aria-label like "Ask a question about {game}"
  const input = page.locator('input[aria-label^="Ask a question"]');
  const count = await input.count();
  if (count > 0) {
    await input.fill(question);
    await wait(500);
    // Click the "Ask" button
    const askBtn = page.locator('button[aria-label="Submit question"]');
    if (await askBtn.count() > 0) {
      await askBtn.click();
    } else {
      await input.press('Enter');
    }
    // Wait for response (look for the AI response bubble to appear)
    log(bot, '  Waiting for AI response...');
    await wait(8000); // Give AI time to respond
    log(bot, '  Response should be received');
  } else {
    log(bot, '  Q&A input not found');
  }
}

async function playTTS(page, seconds, bot) {
  log(bot, `Playing TTS for ${seconds}s`);
  // TTS buttons: the speaker emoji 🔊 buttons, or the bottom bar play button
  // In accordion sections: span[role="button"][aria-label="Read this section aloud"]
  const speakerBtn = page.locator('span[role="button"][aria-label="Read this section aloud"]').first();
  if (await speakerBtn.count() > 0) {
    await speakerBtn.click();
    await wait(seconds * 1000);
    // Stop: aria-label changes to "Stop reading aloud"
    const stopBtn = page.locator('span[role="button"][aria-label="Stop reading aloud"]').first();
    if (seconds < 25 && await stopBtn.count() > 0) {
      await stopBtn.click();
      log(bot, '  TTS stopped');
    } else {
      log(bot, '  TTS played for full duration');
    }
    return;
  }
  // Fallback: bottom bar play button
  const playBtn = page.locator('button[title="Read aloud"]').first();
  if (await playBtn.count() > 0) {
    await playBtn.click();
    await wait(seconds * 1000);
    if (seconds < 25) {
      const pauseBtn = page.locator('button[title="Pause"]').first();
      if (await pauseBtn.count() > 0) {
        await pauseBtn.click();
        log(bot, '  TTS paused');
      }
    }
    return;
  }
  log(bot, '  No TTS button found');
}

async function goBackToGames(page, bot) {
  log(bot, 'Going back to games');
  const backBtn = page.locator('button[aria-label="Back to game selector"]');
  if (await backBtn.count() > 0) {
    await backBtn.click();
    await wait(3000);
  } else {
    await page.goto(`${BASE_URL}/games`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await wait(3000);
  }
}

async function openOrderPanel(page, bot) {
  log(bot, 'Opening order panel');
  // Order button contains 🍽 emoji
  const orderBtn = page.locator('button').filter({ hasText: '🍽' }).first();
  if (await orderBtn.count() > 0) {
    await orderBtn.click();
    await wait(2000);
  } else {
    log(bot, '  Order button not found');
  }
}

// ============================================================
// BOT 1 — "The Browser" (Meepleville)
// ============================================================
async function runBot1() {
  log(1, '=== STARTING: The Browser (Meepleville) ===');
  const browser = await chromium.launch({ headless: true });

  // Session 1
  log(1, '--- Session 1 ---');
  const ctx1 = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36 GMAI-Bot1S1',
    viewport: { width: 1280, height: 800 },
  });
  const p1 = await ctx1.newPage();
  await login(p1, 'demo@meepleville.com', 'gmai2026', 1);

  // Searches
  for (const q of ['catan', 'wingspan', 'party']) {
    await searchGame(p1, q, 1);
    await randomDelay();
  }

  // Apply filters — these are text buttons in the filter section
  for (const filterText of ['2', '<30m', 'gateway']) {
    const btn = p1.locator('button').filter({ hasText: new RegExp(`^${filterText.replace(/[<>]/g, '\\$&')}$`) }).first();
    if (await btn.count() > 0) {
      log(1, `Applying filter: "${filterText}"`);
      await btn.click();
      await wait(1500);
    }
  }

  // Clear filters
  const clearBtn = p1.locator('button').filter({ hasText: 'Clear' }).first();
  if (await clearBtn.count() > 0) await clearBtn.click();
  await wait(1000);

  // Browse 5 games — search, click, view Setup, go back
  for (const game of ['catan', 'azul', 'codenames', 'splendor', 'sushi go']) {
    await searchGame(p1, game, 1);
    await wait(1000);
    if (await clickFirstGameCard(p1, 1)) {
      await switchTab(p1, 'Setup', 3, 1);
      await goBackToGames(p1, 1);
    }
  }

  await ctx1.close();
  log(1, 'Session 1 complete');
  await wait(3000);

  // Session 2 (return visitor)
  log(1, '--- Session 2 (return visitor) ---');
  const ctx2 = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36 GMAI-Bot1S2',
    viewport: { width: 1280, height: 800 },
  });
  const p2 = await ctx2.newPage();
  await login(p2, 'demo@meepleville.com', 'gmai2026', 1);

  for (const game of ['patchwork', 'ticket to ride', 'carcassonne']) {
    await searchGame(p2, game, 1);
    await wait(1000);
    if (await clickFirstGameCard(p2, 1)) {
      await switchTab(p2, 'Setup', 4, 1);
      await switchTab(p2, 'Rules', 3, 1);
      await goBackToGames(p2, 1);
    }
  }

  await ctx2.close();
  await browser.close();
  log(1, '=== COMPLETE: The Browser ===');
}

// ============================================================
// BOT 2 — "The Questioner" (Knight & Day)
// ============================================================
async function runBot2() {
  log(2, '=== STARTING: The Questioner (Knight & Day) ===');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 Chrome/122.0 Mobile Safari/537.36 GMAI-Bot2',
    viewport: { width: 393, height: 851 },
    isMobile: true,
  });
  const page = await ctx.newPage();
  await login(page, 'demo@knightanddaygames.com', 'gmai2026', 2);

  // Open Catan
  await searchGame(page, 'catan', 2);
  await clickFirstGameCard(page, 2);

  // Browse tabs
  await switchTab(page, 'Rules', 10, 2);

  // Switch to Q&A tab - note: aria-label is "Q&A and Notes tab"
  log(2, 'Switching to Q&A tab');
  const qaTab = page.locator('button[role="tab"]').filter({ hasText: 'Q&A' });
  if (await qaTab.count() > 0) await qaTab.first().click();
  await wait(2000);

  // Ask 5 Catan questions
  const catanQs = [
    "How do I set up the board for 4 players?",
    "Can I trade with someone on their turn?",
    "What happens when I roll a 7?",
    "How many points do I need to win?",
    "What's the best opening strategy for beginners?",
  ];
  for (const q of catanQs) {
    await askQuestion(page, q, 2);
    await randomDelay();
  }

  // Strategy tab dwell
  await switchTab(page, 'Strategy', 8, 2);

  // Back to Q&A, ask 2 more
  const qaTab2 = page.locator('button[role="tab"]').filter({ hasText: 'Q&A' });
  if (await qaTab2.count() > 0) await qaTab2.first().click();
  await wait(2000);

  await askQuestion(page, "Should I go for longest road or largest army?", 2);
  await askQuestion(page, "What resources should I prioritize early game?", 2);

  // Go back, open Ticket to Ride
  await goBackToGames(page, 2);
  await searchGame(page, 'ticket to ride', 2);
  await clickFirstGameCard(page, 2);

  const qaTab3 = page.locator('button[role="tab"]').filter({ hasText: 'Q&A' });
  if (await qaTab3.count() > 0) await qaTab3.first().click();
  await wait(2000);

  for (const q of [
    "How do you claim a route?",
    "What are destination tickets?",
    "Can you pick up face-down train cards?",
  ]) {
    await askQuestion(page, q, 2);
    await randomDelay();
  }

  await ctx.close();
  await browser.close();
  log(2, '=== COMPLETE: The Questioner ===');
}

// ============================================================
// BOT 3 — "The Listener" (Little Shop of Magic)
// ============================================================
async function runBot3() {
  log(3, '=== STARTING: The Listener (Little Shop of Magic) ===');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15 GMAI-Bot3',
    viewport: { width: 1024, height: 768 },
  });
  const page = await ctx.newPage();
  await login(page, 'demo@littleshopofmagic.com', 'gmai2026', 3);

  // Open Azul
  await searchGame(page, 'azul', 3);
  await clickFirstGameCard(page, 3);

  // TTS on Setup (5s then stop)
  await switchTab(page, 'Setup', 2, 3);
  await playTTS(page, 5, 3);

  // TTS on Rules (15s then stop)
  await switchTab(page, 'Rules', 2, 3);
  await playTTS(page, 15, 3);

  // TTS on Strategy (let complete — 30s)
  await switchTab(page, 'Strategy', 2, 3);
  await playTTS(page, 30, 3);

  // Q&A: ask question, play TTS on response
  const qaTab = page.locator('button[role="tab"]').filter({ hasText: 'Q&A' });
  if (await qaTab.count() > 0) await qaTab.first().click();
  await wait(2000);

  await askQuestion(page, "How does scoring work in Azul?", 3);

  // Try to click TTS on the AI response (🔊 button near the response)
  log(3, 'Playing TTS on AI response');
  const responseTTS = page.locator('button').filter({ hasText: '🔊' }).first();
  if (await responseTTS.count() > 0) {
    await responseTTS.click();
    await wait(10000);
  }

  // Second game: Codenames
  await goBackToGames(page, 3);
  await searchGame(page, 'codenames', 3);
  await clickFirstGameCard(page, 3);

  await switchTab(page, 'Setup', 2, 3);
  await playTTS(page, 10, 3);
  await switchTab(page, 'Rules', 2, 3);
  await playTTS(page, 30, 3);

  await ctx.close();
  await browser.close();
  log(3, '=== COMPLETE: The Listener ===');
}

// ============================================================
// BOT 4 — "The Orderer" (Shall We Play)
// ============================================================
async function runBot4() {
  log(4, '=== STARTING: The Orderer (Shall We Play) ===');
  const browser = await chromium.launch({ headless: true });

  // Session 1
  log(4, '--- Session 1 ---');
  const ctx1 = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1 GMAI-Bot4S1',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const p1 = await ctx1.newPage();
  await login(p1, 'demo@shallweplay.com', 'gmai2026', 4);

  // Browse games page for a bit
  await wait(3000);

  // Open a game
  await searchGame(p1, 'king of tokyo', 4);
  await clickFirstGameCard(p1, 4);

  await switchTab(p1, 'Setup', 5, 4);
  await switchTab(p1, 'Rules', 10, 4);

  // Open order panel
  await openOrderPanel(p1, 4);
  await wait(3000); // Browse menu

  // Try to add items — click "Add" buttons
  log(4, 'Adding items to cart');
  const addBtns = p1.locator('button').filter({ hasText: /^Add$/ });
  const addCount = await addBtns.count();
  for (let i = 0; i < Math.min(3, addCount); i++) {
    await addBtns.nth(i).click().catch(() => {});
    await wait(1000);
    log(4, `  Added item ${i + 1}`);
  }

  // Close order panel (click the × button)
  const closeBtn = p1.locator('button').filter({ hasText: '×' }).first();
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
    await wait(1500);
  }

  // Ask a question
  const qaTab = p1.locator('button[role="tab"]').filter({ hasText: 'Q&A' });
  if (await qaTab.count() > 0) await qaTab.first().click();
  await wait(2000);
  await askQuestion(p1, "How does the energy system work?", 4);

  // Open order again, try checkout
  await openOrderPanel(p1, 4);
  await wait(2000);

  // Click "View Cart & Checkout" if visible
  const viewCartBtn = p1.locator('button').filter({ hasText: 'View Cart' });
  if (await viewCartBtn.count() > 0) {
    await viewCartBtn.first().click();
    await wait(2000);

    // Fill customer name
    const nameInput = p1.locator('input[placeholder*="Sarah"]');
    if (await nameInput.count() > 0) {
      await nameInput.fill('Test Customer Bot4');
      await wait(500);
    }

    // Place order
    const placeBtn = p1.locator('button').filter({ hasText: 'Place Order' });
    if (await placeBtn.count() > 0) {
      await placeBtn.first().click();
      await wait(3000);
      log(4, 'Order placed!');
    }
  }

  // Score tab
  await switchTab(p1, 'Score', 15, 4);

  await ctx1.close();
  log(4, 'Session 1 complete');
  await wait(3000);

  // Session 2
  log(4, '--- Session 2 (return visitor) ---');
  const ctx2 = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1 GMAI-Bot4S2',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const p2 = await ctx2.newPage();
  await login(p2, 'demo@shallweplay.com', 'gmai2026', 4);

  await searchGame(p2, 'wingspan', 4);
  await clickFirstGameCard(p2, 4);
  await switchTab(p2, 'Rules', 5, 4);

  // Order again
  await openOrderPanel(p2, 4);
  await wait(2000);
  const addBtns2 = p2.locator('button').filter({ hasText: /^Add$/ });
  const addCount2 = await addBtns2.count();
  for (let i = 0; i < Math.min(2, addCount2); i++) {
    await addBtns2.nth(i).click().catch(() => {});
    await wait(1000);
  }
  const viewCart2 = p2.locator('button').filter({ hasText: 'View Cart' });
  if (await viewCart2.count() > 0) {
    await viewCart2.first().click();
    await wait(1500);
    const nameInput2 = p2.locator('input[placeholder*="Sarah"]');
    if (await nameInput2.count() > 0) await nameInput2.fill('Bot4 Return Visit');
    const placeBtn2 = p2.locator('button').filter({ hasText: 'Place Order' });
    if (await placeBtn2.count() > 0) {
      await placeBtn2.first().click();
      await wait(3000);
      log(4, 'Order 2 placed!');
    }
  }

  await ctx2.close();
  await browser.close();
  log(4, '=== COMPLETE: The Orderer ===');
}

// ============================================================
// BOT 5 — "The Scorer" (Grouchy John's)
// ============================================================
async function runBot5() {
  log(5, '=== STARTING: The Scorer (Grouchy Johns) ===');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Chrome/122.0 Mobile Safari/537.36 GMAI-Bot5',
    viewport: { width: 412, height: 915 },
    isMobile: true,
  });
  const page = await ctx.newPage();
  await login(page, 'demo@grouchyjohns.com', 'gmai2026', 5);

  // Open Catan
  await searchGame(page, 'catan', 5);
  await clickFirstGameCard(page, 5);
  await switchTab(page, 'Score', 3, 5);

  // The Score tab has a lobby-based system — let's interact with it
  // Look for a "Start" or name input to begin scoring
  log(5, 'Interacting with Score tab');

  // Enter player name (there should be an input for the host name)
  const nameInput = page.locator('input').first();
  if (await nameInput.count() > 0) {
    await nameInput.fill('Alice');
    await wait(1000);
  }

  // Click Start button
  const startBtn = page.locator('button').filter({ hasText: /Start|Create|Begin/ }).first();
  if (await startBtn.count() > 0) {
    await startBtn.click();
    await wait(3000);
    log(5, 'Score session started');
  }

  // Try to add more players
  for (const name of ['Bob', 'Charlie']) {
    const addPlayerBtn = page.locator('button').filter({ hasText: /\+ Player|Add Player/ }).first();
    if (await addPlayerBtn.count() > 0) {
      await addPlayerBtn.click();
      await wait(1500);
      log(5, `Added player: ${name}`);
    }
  }

  // Enter some scores in number inputs
  const scoreInputs = page.locator('input[type="number"], input[inputmode="numeric"]');
  const inputCount = await scoreInputs.count();
  log(5, `Found ${inputCount} score inputs`);
  for (let i = 0; i < inputCount; i++) {
    const score = Math.floor(Math.random() * 10) + 1;
    await scoreInputs.nth(i).fill(String(score)).catch(() => {});
    await wait(300);
  }
  await wait(2000);

  // Show total
  const showTotalBtn = page.locator('button').filter({ hasText: /Show Total|Reveal/ }).first();
  if (await showTotalBtn.count() > 0) {
    await showTotalBtn.click();
    await wait(3000);
    log(5, 'Showed totals');
  }

  // End game
  const endBtn = page.locator('button').filter({ hasText: /End Game/ }).first();
  if (await endBtn.count() > 0) {
    await endBtn.click();
    await wait(5000);
    log(5, 'Game ended');
  }

  // Go back, try another game
  await goBackToGames(page, 5);
  await searchGame(page, 'azul', 5);
  await clickFirstGameCard(page, 5);
  await switchTab(page, 'Score', 3, 5);

  // Quick score session for Azul
  const nameInput2 = page.locator('input').first();
  if (await nameInput2.count() > 0) {
    await nameInput2.fill('Dave');
    await wait(1000);
  }
  const startBtn2 = page.locator('button').filter({ hasText: /Start|Create|Begin/ }).first();
  if (await startBtn2.count() > 0) {
    await startBtn2.click();
    await wait(3000);
  }

  // Fill available score inputs
  const scoreInputs2 = page.locator('input[type="number"], input[inputmode="numeric"]');
  const count2 = await scoreInputs2.count();
  for (let i = 0; i < count2; i++) {
    await scoreInputs2.nth(i).fill(String(Math.floor(Math.random() * 15) + 1)).catch(() => {});
    await wait(300);
  }

  await wait(3000);
  await ctx.close();
  await browser.close();
  log(5, '=== COMPLETE: The Scorer ===');
}

// ============================================================
// BOT 6 — "The Note Taker" (Natural Twenty)
// ============================================================
async function runBot6() {
  log(6, '=== STARTING: The Note Taker (Natural Twenty) ===');
  const browser = await chromium.launch({ headless: true });

  // Session 1
  log(6, '--- Session 1 ---');
  const ctx1 = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0 Safari/537.36 GMAI-Bot6S1',
    viewport: { width: 1440, height: 900 },
  });
  const p1 = await ctx1.newPage();
  await login(p1, 'demo@naturaltwentygames.com', 'gmai2026', 6);

  // Open Spirit Island
  await searchGame(p1, 'spirit island', 6);
  await clickFirstGameCard(p1, 6);

  // Q&A tab
  const qaTab = p1.locator('button[role="tab"]').filter({ hasText: 'Q&A' });
  if (await qaTab.count() > 0) await qaTab.first().click();
  await wait(2000);

  await askQuestion(p1, "What are the basic powers for each spirit?", 6);

  // Copy response (📋 button)
  log(6, 'Copying AI response');
  const copyBtn = p1.locator('button[title="Copy to clipboard"]').first();
  if (await copyBtn.count() > 0) {
    await copyBtn.click();
    await wait(1500);
    log(6, '  Copied!');
  }

  // Click Paste button for notes
  log(6, 'Pasting to notes');
  const pasteBtn = p1.locator('button').filter({ hasText: 'Paste' }).first();
  if (await pasteBtn.count() > 0) {
    await pasteBtn.click();
    await wait(1500);
    log(6, '  Pasted!');
  }

  // Type in notes
  log(6, 'Typing in notes');
  const notesArea = p1.locator('textarea[placeholder*="Jot down"]');
  if (await notesArea.count() > 0) {
    await notesArea.type('Remember: Lightning focuses on fear, River on pushing. Earth is defensive.', { delay: 40 });
    await wait(6000); // Wait for auto-save
    log(6, '  Notes typed, waiting for auto-save...');
  }

  // Ask more questions
  await askQuestion(p1, "How does fear work?", 6);

  // Copy that response too
  const copyBtn2 = p1.locator('button[title="Copy to clipboard"]').first();
  if (await copyBtn2.count() > 0) {
    await copyBtn2.click();
    await wait(1000);
  }
  const pasteBtn2 = p1.locator('button').filter({ hasText: 'Paste' }).first();
  if (await pasteBtn2.count() > 0) {
    await pasteBtn2.click();
    await wait(1000);
  }

  // Switch to Rules, dwell, back to Q&A
  await switchTab(p1, 'Rules', 10, 6);

  const qaTab2 = p1.locator('button[role="tab"]').filter({ hasText: 'Q&A' });
  if (await qaTab2.count() > 0) await qaTab2.first().click();
  await wait(2000);
  await askQuestion(p1, "What's the difference between slow and fast powers?", 6);

  await ctx1.close();
  log(6, 'Session 1 complete');
  await wait(3000);

  // Session 2 (return visitor)
  log(6, '--- Session 2 (return visitor) ---');
  const ctx2 = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0 Safari/537.36 GMAI-Bot6S2',
    viewport: { width: 1440, height: 900 },
  });
  const p2 = await ctx2.newPage();
  await login(p2, 'demo@naturaltwentygames.com', 'gmai2026', 6);

  await searchGame(p2, 'spirit island', 6);
  await clickFirstGameCard(p2, 6);

  const qaTab3 = p2.locator('button[role="tab"]').filter({ hasText: 'Q&A' });
  if (await qaTab3.count() > 0) await qaTab3.first().click();
  await wait(5000);

  log(6, 'Checking if notes persisted from session 1');
  const notesArea2 = p2.locator('textarea[placeholder*="Jot down"]');
  if (await notesArea2.count() > 0) {
    const notesText = await notesArea2.inputValue();
    log(6, `  Notes content: "${notesText.slice(0, 80)}..."`);
  }

  await ctx2.close();
  await browser.close();
  log(6, '=== COMPLETE: The Note Taker ===');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('========================================');
  console.log('GMAI Data Generator — 6 Bot Test Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('========================================\n');

  const bots = [
    { name: 'Bot 1 — The Browser (Meepleville)', fn: runBot1 },
    { name: 'Bot 2 — The Questioner (Knight & Day)', fn: runBot2 },
    { name: 'Bot 3 — The Listener (Little Shop of Magic)', fn: runBot3 },
    { name: 'Bot 4 — The Orderer (Shall We Play)', fn: runBot4 },
    { name: 'Bot 5 — The Scorer (Grouchy Johns)', fn: runBot5 },
    { name: 'Bot 6 — The Note Taker (Natural Twenty)', fn: runBot6 },
  ];

  const results = [];

  for (const bot of bots) {
    try {
      const start = Date.now();
      await bot.fn();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      results.push({ name: bot.name, status: 'PASS', time: `${elapsed}s` });
      console.log(`\n  PASS ${bot.name} completed in ${elapsed}s\n`);
    } catch (error) {
      results.push({ name: bot.name, status: 'FAIL', error: error.message });
      console.log(`\n  FAIL ${bot.name}: ${error.message}\n`);
      console.log(error.stack);
    }
    await wait(3000);
  }

  // Summary
  console.log('\n========================================');
  console.log('TEST SUITE SUMMARY');
  console.log('========================================');
  for (const r of results) {
    const icon = r.status === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`  ${icon}  ${r.name}: ${r.status} ${r.time || ''} ${r.error || ''}`);
  }
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`\nTotal: ${passed}/${results.length} passed`);
  console.log(`Finished: ${new Date().toISOString()}`);
}

main().catch(console.error);
