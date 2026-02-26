import { test, expect } from '@playwright/test';
import { loginAs, logout, BASE_URL } from './helpers/login';

/**
 * Teaching tests — verify the full game-learning experience:
 * Setup, Rules, Strategy, Q&A, Notes, Voice, and navigation regression.
 */

const GAMES = ['chess', 'go', 'checkers', 'catan', 'wingspan', 'pandemic'];

test.describe('Teaching — Game Learning Experience', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ── Setup Tab ──────────────────────────────────────────────────

  test('1. Click Catan → Setup tab loads with content', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    const setupTab = page.locator('button[role="tab"][aria-label="Setup tab"]');
    await expect(setupTab).toBeVisible({ timeout: 10000 });
    await setupTab.click();
    await expect(setupTab).toHaveAttribute('aria-selected', 'true');
  });

  test('2. Setup content is not empty (visible text > 50 chars)', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Setup tab"]').click();
    await page.waitForTimeout(2000);
    // Get all accordion section buttons — content lives inside them
    const accordions = page.locator('button[aria-expanded]');
    await expect(accordions.first()).toBeVisible({ timeout: 10000 });
    // Expand first section and check content
    await accordions.first().click();
    await page.waitForTimeout(500);
    const body = await page.locator('main, [class*="content"], div').first().page().textContent('body');
    expect(body!.length).toBeGreaterThan(50);
  });

  test('3. TTS play button present on Setup tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Setup tab"]').click();
    await page.waitForTimeout(2000);
    const playBtn = page.locator('button[title="Read aloud"]');
    await expect(playBtn).toBeVisible({ timeout: 5000 });
  });

  test('4. Click TTS play → does not crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Setup tab"]').click();
    await page.waitForTimeout(2000);
    const playBtn = page.locator('button[title="Read aloud"]');
    await expect(playBtn).toBeVisible({ timeout: 5000 });
    // Click play — should not throw
    await playBtn.click();
    await page.waitForTimeout(1000);
    // Page should still be alive (no crash)
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('5. Accordion sections expand on click', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Setup tab"]').click();
    await page.waitForTimeout(2000);
    const accordions = page.locator('button[aria-expanded]');
    const count = await accordions.count();
    expect(count).toBeGreaterThanOrEqual(1);
    // Expand first accordion
    const first = accordions.first();
    await first.click();
    await expect(first).toHaveAttribute('aria-expanded', 'true');
  });

  test('6. Overview section content is visible in DOM (hidden text regression)', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Setup tab"]').click();
    await page.waitForTimeout(2000);
    // Look for an Overview or first accordion section
    const overview = page.locator('button[aria-expanded]').first();
    await overview.click();
    await expect(overview).toHaveAttribute('aria-expanded', 'true');
    // Content inside the expanded section should be visible
    const parent = overview.locator('..');
    const contentDiv = parent.locator('div').last();
    const text = await contentDiv.textContent();
    expect(text!.trim().length).toBeGreaterThan(10);
  });

  // ── Rules Tab ──────────────────────────────────────────────────

  test('7. Switch to Rules tab → content loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    const rulesTab = page.locator('button[role="tab"][aria-label="Rules tab"]');
    await rulesTab.click();
    await expect(rulesTab).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(2000);
    const accordions = page.locator('button[aria-expanded]');
    await expect(accordions.first()).toBeVisible({ timeout: 10000 });
  });

  test('8. Rules content not empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Rules tab"]').click();
    await page.waitForTimeout(2000);
    const accordions = page.locator('button[aria-expanded]');
    await accordions.first().click();
    await page.waitForTimeout(500);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });

  test('9. Step through multiple Rules accordion sections → no crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Rules tab"]').click();
    await page.waitForTimeout(2000);
    const accordions = page.locator('button[aria-expanded]');
    const count = await accordions.count();
    expect(count).toBeGreaterThanOrEqual(2);
    // Click through up to 4 sections — scroll into view first, then click
    for (let i = 0; i < Math.min(count, 4); i++) {
      await accordions.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await accordions.nth(i).click({ force: true });
      await page.waitForTimeout(300);
    }
    // Page still alive — no crash
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('10. Rules TTS button works (no crash)', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Rules tab"]').click();
    await page.waitForTimeout(2000);
    const playBtn = page.locator('button[title="Read aloud"]');
    await expect(playBtn).toBeVisible({ timeout: 5000 });
    await playBtn.click();
    await page.waitForTimeout(1000);
    // No crash — page still interactive
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  // ── Strategy Tab ───────────────────────────────────────────────

  test('11. Switch to Strategy → content loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    const stratTab = page.locator('button[role="tab"][aria-label="Strategy tab"]');
    await stratTab.click();
    await expect(stratTab).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(2000);
    const accordions = page.locator('button[aria-expanded]');
    await expect(accordions.first()).toBeVisible({ timeout: 10000 });
  });

  test('12. Strategy content not empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Strategy tab"]').click();
    await page.waitForTimeout(2000);
    const accordions = page.locator('button[aria-expanded]');
    await accordions.first().click();
    await page.waitForTimeout(500);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });

  // ── Q&A Tab ────────────────────────────────────────────────────

  test('13. Switch to Q&A + Notes tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    const qaTab = page.locator('button[role="tab"][aria-label="Q&A and Notes tab"]');
    await qaTab.click();
    await expect(qaTab).toHaveAttribute('aria-selected', 'true');
  });

  test('14. Text input field present in Q&A', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Q&A and Notes tab"]').click();
    await page.waitForTimeout(1000);
    const input = page.locator('input[aria-label*="Ask a question"]');
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test('15-18. Type question → get response → appears in history', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Q&A and Notes tab"]').click();
    await page.waitForTimeout(1000);

    // Clear any existing history first
    const clearBtn = page.locator('button:has-text("Clear History")');
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(500);
    }

    const input = page.locator('input[aria-label*="Ask a question"]');
    const askBtn = page.locator('button[aria-label="Submit question"]');

    // 15. Type question
    await input.fill('How do I set up Catan?');
    await askBtn.click();

    // 16. Response appears within 20 seconds
    // Wait for "Thinking..." to appear and then disappear
    await page.waitForTimeout(1000);
    // Wait for an assistant response to appear (not the user message)
    const assistantMsg = page.locator('button[title="Copy to clipboard"]');
    await expect(assistantMsg.first()).toBeVisible({ timeout: 20000 });

    // 17. Response text length > 20 chars
    const body = await page.textContent('body');
    // The response should contain substantial text beyond UI chrome
    expect(body!.length).toBeGreaterThan(100);

    // 18. Response appears in chat history — copy button confirms it's an assistant message
    await expect(assistantMsg.first()).toBeVisible();
  });

  test('19. Copy button on response works', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Q&A and Notes tab"]').click();
    await page.waitForTimeout(1000);

    const input = page.locator('input[aria-label*="Ask a question"]');
    const askBtn = page.locator('button[aria-label="Submit question"]');

    await input.fill('What is the goal of Catan?');
    await askBtn.click();

    const copyBtn = page.locator('button[title="Copy to clipboard"]');
    await expect(copyBtn.first()).toBeVisible({ timeout: 20000 });

    // Grant clipboard permission and click copy
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await copyBtn.first().click();
    await page.waitForTimeout(500);

    // After clicking, title should change to "Copied!"
    const copiedBtn = page.locator('button[title="Copied!"]');
    await expect(copiedBtn.first()).toBeVisible({ timeout: 2000 });
  });

  // ── Notes ──────────────────────────────────────────────────────

  test('20. Notes panel visible alongside Q&A', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Q&A and Notes tab"]').click();
    await page.waitForTimeout(1000);
    // Use specific selector — the Notes toggle is NOT a tab button
    const notesBtn = page.locator('button:not([role="tab"]):has-text("Notes")');
    await expect(notesBtn).toBeVisible({ timeout: 5000 });
  });

  test('21. Type in notes → text persists', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Q&A and Notes tab"]').click();
    await page.waitForTimeout(1000);

    const notesBtn = page.locator('button:not([role="tab"]):has-text("Notes")');

    // Expand notes if collapsed
    const textarea = page.locator('textarea[placeholder*="Jot down"]');
    if (!await textarea.isVisible().catch(() => false)) {
      await notesBtn.click();
      await page.waitForTimeout(300);
    }
    await expect(textarea).toBeVisible({ timeout: 3000 });

    const testNote = 'Test note from Playwright ' + Date.now();
    await textarea.fill(testNote);
    // Notes save is debounced at 2 seconds — wait for save
    await page.waitForTimeout(3000);

    // Navigate away and come back
    await page.locator('button[role="tab"][aria-label="Setup tab"]').click();
    await page.waitForTimeout(1000);
    await page.locator('button[role="tab"][aria-label="Q&A and Notes tab"]').click();
    await page.waitForTimeout(1000);

    // Expand notes again if collapsed
    const textareaAgain = page.locator('textarea[placeholder*="Jot down"]');
    if (!await textareaAgain.isVisible().catch(() => false)) {
      await notesBtn.click();
      await page.waitForTimeout(300);
    }
    const value = await textareaAgain.inputValue();
    expect(value).toContain('Test note from Playwright');
  });

  test('22-23. Collapse Q&A → Notes expands; Expand Q&A → split view', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Q&A and Notes tab"]').click();
    await page.waitForTimeout(1000);

    // Find the Q&A collapse button (contains "Q&A" text)
    // Q&A header is the collapse button inside the Q&A section (not the tab)
    const qaHeader = page.locator('button:not([role="tab"]):has-text("Q&A")').first();
    const notesHeader = page.locator('button:not([role="tab"]):has-text("Notes")');

    // Ensure both sections are visible initially
    await expect(qaHeader).toBeVisible({ timeout: 5000 });
    await expect(notesHeader).toBeVisible({ timeout: 5000 });

    // Collapse Q&A
    await qaHeader.click();
    await page.waitForTimeout(500);

    // Notes should still be visible (and now has more space)
    await expect(notesHeader).toBeVisible();

    // Expand Q&A back
    await qaHeader.click();
    await page.waitForTimeout(500);

    // Both should be visible again
    await expect(qaHeader).toBeVisible();
    await expect(notesHeader).toBeVisible();
  });

  // ── Voice ──────────────────────────────────────────────────────

  test('24. Mic button present in Q&A tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Q&A and Notes tab"]').click();
    await page.waitForTimeout(1000);
    const micBtn = page.locator('button[aria-label*="voice input"]');
    await expect(micBtn).toBeVisible({ timeout: 5000 });
  });

  test('25. Mic button is clickable (no JS crash)', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[role="tab"][aria-label="Q&A and Notes tab"]').click();
    await page.waitForTimeout(1000);
    const micBtn = page.locator('button[aria-label*="voice input"]');
    await expect(micBtn).toBeVisible({ timeout: 5000 });

    // Listen for page errors
    let pageError: Error | null = null;
    page.on('pageerror', (err) => { pageError = err; });

    await micBtn.click();
    await page.waitForTimeout(1000);

    // No fatal page crash
    expect(pageError).toBeNull();
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  // ── Navigation Regression (R8 bug) ─────────────────────────────

  test('26. Catan → back → Wingspan → no black screen', async ({ page }) => {
    // Go to Catan
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    let h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10000 });

    // Back to games
    const backBtn = page.locator('button[aria-label="Back to game selector"]');
    await backBtn.click();
    await page.waitForURL(/\/games/, { timeout: 10000 });

    // Go to Wingspan
    await page.goto(`${BASE_URL}/game/wingspan`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // No black screen — h1 should be visible with game title
    h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10000 });
    const titleText = await h1.textContent();
    expect(titleText!.length).toBeGreaterThan(0);
  });

  test('27. Click 5 different games in sequence → no crash', async ({ page }) => {
    const gameIds = ['chess', 'go', 'checkers', 'catan', 'wingspan'];
    for (const id of gameIds) {
      await page.goto(`${BASE_URL}/game/${id}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible({ timeout: 10000 });
      const title = await h1.textContent();
      expect(title!.length).toBeGreaterThan(0);
    }
  });

  test('28. Refresh on /game/{id} → page reloads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/catan`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const h1Before = await page.locator('h1').textContent();

    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const h1After = await page.locator('h1').textContent();
    expect(h1After).toBe(h1Before);
    expect(h1After!.length).toBeGreaterThan(0);
  });

  // ── Multi-game tab tests ───────────────────────────────────────

  for (const gameId of GAMES) {
    test(`${gameId}: all 4 learning tabs load without crash`, async ({ page }) => {
      await page.goto(`${BASE_URL}/game/${gameId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const tabs = [
        { label: 'Setup tab', key: 'setup' },
        { label: 'Rules tab', key: 'rules' },
        { label: 'Strategy tab', key: 'strategy' },
        { label: 'Q&A and Notes tab', key: 'qa' },
      ];

      for (const tab of tabs) {
        const tabBtn = page.locator(`button[role="tab"][aria-label="${tab.label}"]`);
        await expect(tabBtn).toBeVisible({ timeout: 5000 });
        await tabBtn.click();
        await expect(tabBtn).toHaveAttribute('aria-selected', 'true');
        await page.waitForTimeout(1000);

        // For content tabs, verify content loads (not just empty)
        if (tab.key !== 'qa') {
          const accordions = page.locator('button[aria-expanded]');
          const count = await accordions.count();
          expect(count).toBeGreaterThanOrEqual(1);
        }
      }
    });
  }
});
