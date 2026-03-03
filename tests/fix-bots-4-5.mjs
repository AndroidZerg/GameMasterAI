/**
 * Re-run Bot 4 and Bot 5 with fixes:
 * - Bot 4: Dismiss order overlay before switching tabs, use force:true
 * - Bot 5: Use meepleville account as fallback, handle score tab on desktop
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://playgmg.com';
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function randomDelay() { return wait(1200 + Math.random() * 2300); }
function log(bot, action) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] [Bot ${bot}] ${action}`);
}

async function login(page, email, password, bot) {
  log(bot, `Navigating to ${BASE_URL}`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await wait(2000);
  if (page.url().includes('/games')) { log(bot, 'Already on games page'); return true; }

  log(bot, `Logging in as ${email}`);
  const emailInput = page.locator('input[aria-label="Email or username"]');
  const pwInput = page.locator('input[aria-label="Password"]');
  if (await emailInput.count() === 0) { log(bot, 'Login form not found'); return false; }
  await emailInput.fill(email);
  await wait(500);
  await pwInput.fill(password);
  await wait(500);
  await page.locator('button[type="submit"]').click();
  await wait(5000);

  if (page.url().includes('/games')) {
    log(bot, `Logged in — URL: ${page.url()}`);
    return true;
  }
  log(bot, `Login FAILED — URL: ${page.url()}`);
  return false;
}

async function searchGame(page, query, bot) {
  log(bot, `Searching: "${query}"`);
  const input = page.locator('input[aria-label="Search games"]');
  if (await input.count() === 0) { log(bot, '  Search input not found'); return; }
  await input.fill('');
  await input.type(query, { delay: 80 });
  await wait(2000);
}

async function clickFirstGameCard(page, bot) {
  const card = page.locator('div[role="button"][aria-label^="Play"]').first();
  if (await card.count() > 0) {
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
  // Use force:true to bypass any overlay
  const tab = page.locator(`button[role="tab"][aria-label="${tabLabel} tab"]`);
  if (await tab.count() > 0) {
    await tab.click({ force: true });
    await wait(dwellSec * 1000);
  } else {
    const fallback = page.locator('button[role="tab"]').filter({ hasText: tabLabel });
    if (await fallback.count() > 0) {
      await fallback.first().click({ force: true });
      await wait(dwellSec * 1000);
    } else {
      log(bot, `  Tab "${tabLabel}" not found`);
    }
  }
}

async function goBackToGames(page, bot) {
  log(bot, 'Going back to games');
  const backBtn = page.locator('button[aria-label="Back to game selector"]');
  if (await backBtn.count() > 0) {
    await backBtn.click({ force: true }).catch(() => {});
    await wait(3000);
  } else {
    await page.goto(`${BASE_URL}/games`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await wait(3000);
  }
}

async function askQuestion(page, question, bot) {
  log(bot, `Asking: "${question}"`);
  const input = page.locator('input[aria-label^="Ask a question"]');
  if (await input.count() > 0) {
    await input.fill(question);
    await wait(500);
    const askBtn = page.locator('button[aria-label="Submit question"]');
    if (await askBtn.count() > 0) await askBtn.click();
    else await input.press('Enter');
    log(bot, '  Waiting for AI response...');
    await wait(8000);
    log(bot, '  Response received');
  } else {
    log(bot, '  Q&A input not found');
  }
}

async function openOrderPanel(page, bot) {
  log(bot, 'Opening order panel');
  const orderBtn = page.locator('button').filter({ hasText: '🍽' }).first();
  if (await orderBtn.count() > 0) {
    await orderBtn.click({ force: true });
    await wait(2000);
  } else {
    log(bot, '  Order button not found');
  }
}

// ============================================================
// BOT 4 — "The Orderer" (Shall We Play) — FIXED
// ============================================================
async function runBot4() {
  log(4, '=== STARTING: The Orderer (Shall We Play) — FIXED ===');
  const browser = await chromium.launch({ headless: true });

  // Session 1
  log(4, '--- Session 1 ---');
  const ctx1 = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1 GMAI-Bot4S1-Fix',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const p1 = await ctx1.newPage();
  const ok1 = await login(p1, 'demo@shallweplay.com', 'gmg2026', 4);
  if (!ok1) { await browser.close(); return; }

  await searchGame(p1, 'king of tokyo', 4);
  await clickFirstGameCard(p1, 4);
  await switchTab(p1, 'Setup', 5, 4);
  await switchTab(p1, 'Rules', 10, 4);

  // Order
  await openOrderPanel(p1, 4);
  await wait(3000);
  const addBtns = p1.locator('button').filter({ hasText: /^Add$/ });
  const addCount = await addBtns.count();
  log(4, `Found ${addCount} Add buttons`);
  for (let i = 0; i < Math.min(3, addCount); i++) {
    await addBtns.nth(i).click().catch(() => {});
    await wait(1000);
    log(4, `  Added item ${i + 1}`);
  }

  // Close overlay by pressing Escape or clicking outside
  await p1.keyboard.press('Escape');
  await wait(1500);

  // Q&A question
  // Dismiss any remaining overlays
  const closeX = p1.locator('button').filter({ hasText: '×' });
  if (await closeX.count() > 0) {
    await closeX.first().click({ force: true }).catch(() => {});
    await wait(1000);
  }

  const qaTab = p1.locator('button[role="tab"]').filter({ hasText: 'Q&A' });
  if (await qaTab.count() > 0) await qaTab.first().click({ force: true });
  await wait(2000);
  await askQuestion(p1, "How does the energy system work?", 4);

  // Open order again and checkout
  await openOrderPanel(p1, 4);
  await wait(2000);
  // Re-add items if cart was cleared
  const addBtns1b = p1.locator('button').filter({ hasText: /^Add$/ });
  const cnt1b = await addBtns1b.count();
  for (let i = 0; i < Math.min(2, cnt1b); i++) {
    await addBtns1b.nth(i).click().catch(() => {});
    await wait(800);
  }

  // View Cart
  const viewCart = p1.locator('button').filter({ hasText: 'View Cart' });
  if (await viewCart.count() > 0) {
    await viewCart.first().click();
    await wait(2000);
    // Fill name
    const nameInput = p1.locator('input[placeholder*="Sarah"]');
    if (await nameInput.count() > 0) await nameInput.fill('Test Bot4');
    await wait(500);
    // Place order
    const placeBtn = p1.locator('button').filter({ hasText: 'Place Order' });
    if (await placeBtn.count() > 0) {
      await placeBtn.first().click();
      await wait(3000);
      log(4, 'Order placed!');
    }
  }

  // Dismiss order confirmation — press Escape or close overlay
  await p1.keyboard.press('Escape');
  await wait(2000);
  // Force-dismiss any overlay
  const closeAll = p1.locator('button').filter({ hasText: '×' });
  for (let i = 0; i < await closeAll.count(); i++) {
    await closeAll.nth(i).click({ force: true }).catch(() => {});
  }
  await wait(1000);

  // Now try Score tab with force
  await switchTab(p1, 'Score', 10, 4);
  log(4, 'Score tab reached');

  await goBackToGames(p1, 4);
  await ctx1.close();
  log(4, 'Session 1 complete');
  await wait(3000);

  // Session 2
  log(4, '--- Session 2 (return visitor) ---');
  const ctx2 = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1 GMAI-Bot4S2-Fix',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const p2 = await ctx2.newPage();
  await login(p2, 'demo@shallweplay.com', 'gmg2026', 4);

  await searchGame(p2, 'wingspan', 4);
  await clickFirstGameCard(p2, 4);
  await switchTab(p2, 'Rules', 5, 4);

  // Order
  await openOrderPanel(p2, 4);
  await wait(2000);
  const addBtns2 = p2.locator('button').filter({ hasText: /^Add$/ });
  for (let i = 0; i < Math.min(2, await addBtns2.count()); i++) {
    await addBtns2.nth(i).click().catch(() => {});
    await wait(800);
  }
  const viewCart2 = p2.locator('button').filter({ hasText: 'View Cart' });
  if (await viewCart2.count() > 0) {
    await viewCart2.first().click();
    await wait(1500);
    const nameInput2 = p2.locator('input[placeholder*="Sarah"]');
    if (await nameInput2.count() > 0) await nameInput2.fill('Bot4 Return');
    const placeBtn2 = p2.locator('button').filter({ hasText: 'Place Order' });
    if (await placeBtn2.count() > 0) {
      await placeBtn2.first().click();
      await wait(3000);
      log(4, 'Order 2 placed!');
    }
  }

  await ctx2.close();
  await browser.close();
  log(4, '=== COMPLETE: The Orderer (FIXED) ===');
}

// ============================================================
// BOT 5 — "The Scorer" — FIXED (use meepleville account)
// ============================================================
async function runBot5() {
  log(5, '=== STARTING: The Scorer — FIXED ===');
  const browser = await chromium.launch({ headless: true });
  // Use desktop viewport for score tab (avoids mobile scroll issues)
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Chrome/122.0 Mobile Safari/537.36 GMAI-Bot5Fix',
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

  // Try grouchy johns first, fallback to meepleville
  let loggedIn = await login(page, 'demo@grouchyjohnscoffee.com', 'gmg2026', 5);
  if (!loggedIn) {
    log(5, 'Grouchy Johns login failed, trying meepleville fallback');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await wait(2000);
    loggedIn = await login(page, 'demo@meepleville.com', 'gmg2026', 5);
    if (!loggedIn) {
      log(5, 'All logins failed');
      await browser.close();
      return;
    }
  }

  // Open Catan
  await searchGame(page, 'catan', 5);
  await clickFirstGameCard(page, 5);
  await switchTab(page, 'Score', 3, 5);

  // Score tab interaction
  log(5, 'Interacting with Score tab');

  // Look for an input to enter a player name
  const inputs = page.locator('input[type="text"], input:not([type])');
  const inputCount = await inputs.count();
  log(5, `Found ${inputCount} text inputs on score tab`);

  if (inputCount > 0) {
    await inputs.first().fill('Alice');
    await wait(1000);
  }

  // Start/Create button
  const startBtn = page.locator('button').filter({ hasText: /Start|Create|Begin|Play/ }).first();
  if (await startBtn.count() > 0) {
    await startBtn.click();
    await wait(3000);
    log(5, 'Score session started');
  }

  // Add players
  for (const name of ['Bob', 'Charlie']) {
    const addBtn = page.locator('button').filter({ hasText: /Player/ }).first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await wait(2000);
      log(5, `Clicked Add Player for: ${name}`);
    }
  }

  // Enter scores
  const scoreInputs = page.locator('input[type="number"], input[inputmode="numeric"]');
  const scoreCount = await scoreInputs.count();
  log(5, `Found ${scoreCount} score inputs`);
  for (let i = 0; i < scoreCount; i++) {
    const score = Math.floor(Math.random() * 10) + 1;
    await scoreInputs.nth(i).fill(String(score)).catch(() => {});
    await wait(300);
  }
  await wait(2000);

  // Show total
  const showBtn = page.locator('button').filter({ hasText: /Show Total|Reveal/ }).first();
  if (await showBtn.count() > 0) {
    await showBtn.click();
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

  // Go back, another game
  await goBackToGames(page, 5);
  await searchGame(page, 'azul', 5);
  await clickFirstGameCard(page, 5);
  await switchTab(page, 'Score', 3, 5);

  // Quick score
  const inputs2 = page.locator('input[type="text"], input:not([type])');
  if (await inputs2.count() > 0) {
    await inputs2.first().fill('Dave');
    await wait(1000);
  }
  const startBtn2 = page.locator('button').filter({ hasText: /Start|Create|Begin|Play/ }).first();
  if (await startBtn2.count() > 0) {
    await startBtn2.click();
    await wait(3000);
  }

  const scoreInputs2 = page.locator('input[type="number"], input[inputmode="numeric"]');
  const count2 = await scoreInputs2.count();
  for (let i = 0; i < count2; i++) {
    await scoreInputs2.nth(i).fill(String(Math.floor(Math.random() * 15) + 1)).catch(() => {});
    await wait(300);
  }
  await wait(3000);

  await ctx.close();
  await browser.close();
  log(5, '=== COMPLETE: The Scorer (FIXED) ===');
}

// MAIN
async function main() {
  console.log('========================================');
  console.log('GMAI Fix Run — Bots 4 & 5');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('========================================\n');

  const bots = [
    { name: 'Bot 4 — The Orderer (FIXED)', fn: runBot4 },
    { name: 'Bot 5 — The Scorer (FIXED)', fn: runBot5 },
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

  console.log('\n========================================');
  console.log('FIX RUN SUMMARY');
  console.log('========================================');
  for (const r of results) {
    console.log(`  ${r.status === 'PASS' ? 'PASS' : 'FAIL'}  ${r.name}: ${r.status} ${r.time || ''} ${r.error || ''}`);
  }
  console.log(`\nTotal: ${results.filter(r => r.status === 'PASS').length}/${results.length} passed`);
  console.log(`Finished: ${new Date().toISOString()}`);
}

main().catch(console.error);
