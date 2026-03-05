/**
 * Capture screenshots of playgmg.com for sales deck.
 * Run: node screenshots/capture-deck.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DECK_DIR = path.join(__dirname, 'deck');
const BASE = 'https://playgmg.com';
const VIEWPORT = { width: 1280, height: 800 };

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[aria-label="Email or username"]', email);
  await page.fill('input[aria-label="Password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(games|venue|admin|expired)/, { timeout: 20000 });
  await wait(2000);
}

async function shot(page, name, fullPage = false) {
  const fp = path.join(DECK_DIR, name);
  await page.screenshot({ path: fp, fullPage });
  log(`  Saved: ${name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ═══════════════════════════════════════════
  // PART A: Front-end screenshots (Meepleville)
  // ═══════════════════════════════════════════
  log('Part A: Front-end (Meepleville)');
  const ctxA = await browser.newContext({ viewport: VIEWPORT });
  const pageA = await ctxA.newPage();

  await login(pageA, 'demo@meepleville.com', 'gmg2026');
  log('Logged in as Meepleville');

  // 01 - Game Library
  log('01: Game Library');
  await pageA.goto(`${BASE}/games`, { waitUntil: 'networkidle' });
  await wait(3000); // let images load
  await shot(pageA, '01-game-library.png');

  // 02 - Game Library Search
  log('02: Game Library Search');
  const searchInput = pageA.locator('input[type="text"]').first();
  await searchInput.fill('Catan');
  await wait(1500);
  await shot(pageA, '02-game-library-search.png');

  // 03 - Game Teacher Setup tab
  log('03: Game Teacher - Setup');
  await pageA.goto(`${BASE}/game/catan`, { waitUntil: 'networkidle' });
  await wait(3000);
  // Click Setup tab if not already active
  const setupTab = pageA.locator('button[role="tab"]:has-text("Setup")');
  if (await setupTab.count() > 0) await setupTab.click();
  await wait(2000);
  await shot(pageA, '03-game-teacher-setup.png', true);

  // 04 - Rules tab
  log('04: Game Teacher - Rules');
  await pageA.locator('button[role="tab"]:has-text("Rules")').click();
  await wait(2000);
  await shot(pageA, '04-game-teacher-rules.png', true);

  // 05 - Strategy tab
  log('05: Game Teacher - Strategy');
  await pageA.locator('button[role="tab"]:has-text("Strategy")').click();
  await wait(2000);
  await shot(pageA, '05-game-teacher-strategy.png', true);

  // 06 - Q&A tab with question
  log('06: Game Teacher - Q&A');
  await pageA.locator('button[role="tab"]:has-text("Q&A")').click();
  await wait(1500);
  // Find the text input for Q&A
  const qaInput = pageA.locator('textarea, input[type="text"]').last();
  await qaInput.fill('How does trading work in Catan?');
  // Submit - look for send/submit button
  const sendBtn = pageA.locator('button[type="submit"], button:has-text("Send"), button:has-text("Ask")').first();
  if (await sendBtn.count() > 0) {
    await sendBtn.click();
  } else {
    await qaInput.press('Enter');
  }
  // Wait for AI response
  log('  Waiting for AI response...');
  await wait(12000); // give AI time to respond
  await shot(pageA, '06-game-teacher-qa.png', true);

  // 07 - Score Tracker
  log('07: Score Tracker');
  await pageA.locator('button[role="tab"]:has-text("Score")').click();
  await wait(1500);

  // Enter player name and start
  const nameInput = pageA.locator('input[placeholder="Your name"]');
  if (await nameInput.count() > 0) {
    await nameInput.fill('Billy');
    await wait(500);
    const startBtn = pageA.locator('button:has-text("Start")');
    if (await startBtn.count() > 0) await startBtn.click();
    await wait(2000);
  }

  // Add players
  const addPlayerBtn = pageA.locator('button:has-text("+ Player")');
  if (await addPlayerBtn.count() > 0) {
    await addPlayerBtn.click();
    await wait(500);
    await addPlayerBtn.click();
    await wait(500);
  }

  // Fill in scores - find number inputs
  const scoreInputs = pageA.locator('input[type="number"]');
  const scoreCount = await scoreInputs.count();
  const scores = [5, 7, 4, 3, 2, 6];
  for (let i = 0; i < Math.min(scoreCount, scores.length); i++) {
    await scoreInputs.nth(i).fill(String(scores[i]));
    await wait(200);
  }
  await wait(1000);
  await shot(pageA, '07-score-tracker.png', true);

  // 08 - Order Panel
  log('08: Order Panel');
  const orderBtn = pageA.locator('button:has-text("Order")').first();
  if (await orderBtn.count() > 0) {
    await orderBtn.click();
    await wait(2000);

    // Try to add items to cart
    const addBtns = pageA.locator('button:has-text("Add")');
    const addCount = await addBtns.count();
    for (let i = 0; i < Math.min(3, addCount); i++) {
      await addBtns.nth(i).click();
      await wait(500);
    }
    await wait(1000);
  }
  await shot(pageA, '08-order-panel.png', true);

  // 09 - Game Finder (filter panel)
  log('09: Game Finder Filters');
  await pageA.goto(`${BASE}/games`, { waitUntil: 'networkidle' });
  await wait(2000);
  // Clear any search
  const searchInput2 = pageA.locator('input[type="text"]').first();
  await searchInput2.fill('');
  await wait(500);
  // Click some filters to show them active
  const partyBtn = pageA.locator('button:has-text("Party")');
  if (await partyBtn.count() > 0) await partyBtn.first().click();
  await wait(1500);
  await shot(pageA, '09-game-finder-menu.png');

  // 10 - Side Navigation
  log('10: Side Navigation');
  // Reset filters first
  await pageA.goto(`${BASE}/games`, { waitUntil: 'networkidle' });
  await wait(2000);
  const hamburger = pageA.locator('button[aria-label="Open navigation menu"]');
  if (await hamburger.count() > 0) {
    await hamburger.click();
    await wait(1000);
  }
  await shot(pageA, '10-side-nav.png');

  await ctxA.close();

  // ═══════════════════════════════════════════
  // PART B: Dashboard screenshots (Admin)
  // ═══════════════════════════════════════════
  log('Part B: Dashboard (Admin)');
  const ctxB = await browser.newContext({ viewport: VIEWPORT });
  const pageB = await ctxB.newPage();

  await login(pageB, 'admin', 'watress2');
  log('Logged in as Admin');

  // Navigate to dashboard
  await pageB.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
  await wait(3000);

  // Select Meepleville venue
  const venueSelect = pageB.locator('select');
  if (await venueSelect.count() > 0) {
    await venueSelect.first().selectOption({ label: 'Meepleville Board Game Cafe' });
    await wait(1000);
  }

  // Set date range to cover bot data
  const dateInputs = pageB.locator('input[type="date"]');
  if (await dateInputs.count() >= 2) {
    await dateInputs.nth(0).fill('2026-02-18');
    await dateInputs.nth(1).fill('2026-03-03');
  }

  // Hit refresh
  const refreshBtn = pageB.locator('button:has-text("Refresh")');
  if (await refreshBtn.count() > 0) await refreshBtn.click();
  await wait(4000); // let data load

  // 11 - Dashboard Overview
  log('11: Dashboard Overview');
  await shot(pageB, '11-dashboard-overview.png', true);

  // Dashboard sidebar uses class "dash-sidebar" - target buttons inside it
  const sidebar = pageB.locator('.dash-sidebar');

  // 12 - Dashboard Games tab
  log('12: Dashboard Games');
  await sidebar.locator('button:has-text("Games")').click();
  await wait(3000);
  await shot(pageB, '12-dashboard-games.png', true);

  // 13 - Dashboard Q&A tab
  log('13: Dashboard Q&A');
  await sidebar.locator('button:has-text("Q&A")').click();
  await wait(3000);
  await shot(pageB, '13-dashboard-qa.png', true);

  // 14 - Dashboard Orders tab
  log('14: Dashboard Orders');
  await sidebar.locator('button:has-text("Orders")').click();
  await wait(3000);
  await shot(pageB, '14-dashboard-orders.png', true);

  await ctxB.close();
  await browser.close();

  log('Done! All screenshots saved to screenshots/deck/');
})();
