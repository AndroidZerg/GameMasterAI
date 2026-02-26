import { test, expect } from '@playwright/test';
import { loginAs, logout, BASE_URL } from './helpers/login';

/**
 * Content quality tests — verify game content is real, not placeholder.
 * These are regression tests to catch accidental content wipes.
 */

const PD_GAMES = ['chess', 'go', 'checkers', 'dominoes', 'mahjong'];

/** Helper: navigate to a game tab and return all visible text */
async function getTabContent(page: import('@playwright/test').Page, gameId: string, tabLabel: string): Promise<string> {
  await page.goto(`${BASE_URL}/game/${gameId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const tabBtn = page.locator(`button[role="tab"][aria-label="${tabLabel}"]`);
  await tabBtn.click();
  await page.waitForTimeout(2000);

  // Expand all accordion sections to reveal content
  // Click each collapsed accordion one at a time (re-query each time since DOM changes)
  for (let attempt = 0; attempt < 20; attempt++) {
    const collapsed = page.locator('button[aria-expanded="false"]');
    const remaining = await collapsed.count();
    if (remaining === 0) break;
    await collapsed.first().click({ force: true });
    await page.waitForTimeout(200);
  }

  // Gather all text from the page body
  return await page.textContent('body') ?? '';
}

test.describe('Content — Quality & Regression', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ── Keyword content checks ────────────────────────────────────

  test('1. Chess Setup: mentions pieces/king/pawn', async ({ page }) => {
    const text = await getTabContent(page, 'chess', 'Setup tab');
    const lower = text.toLowerCase();
    const hasKeyword = lower.includes('pieces') || lower.includes('king') || lower.includes('pawn');
    expect(hasKeyword).toBe(true);
  });

  test('2. Chess Rules: mentions checkmate/check', async ({ page }) => {
    const text = await getTabContent(page, 'chess', 'Rules tab');
    const lower = text.toLowerCase();
    const hasKeyword = lower.includes('checkmate') || lower.includes('check');
    expect(hasKeyword).toBe(true);
  });

  test('3. Go Rules: mentions territory/capture', async ({ page }) => {
    const text = await getTabContent(page, 'go', 'Rules tab');
    const lower = text.toLowerCase();
    const hasKeyword = lower.includes('territory') || lower.includes('capture');
    expect(hasKeyword).toBe(true);
  });

  test('4. Catan Setup: mentions hexagonal/tiles/resource', async ({ page }) => {
    const text = await getTabContent(page, 'catan', 'Setup tab');
    const lower = text.toLowerCase();
    const hasKeyword = lower.includes('hexagonal') || lower.includes('tiles') || lower.includes('resource') || lower.includes('hex');
    expect(hasKeyword).toBe(true);
  });

  test('5. Wingspan Rules: mentions bird/eggs/food', async ({ page }) => {
    const text = await getTabContent(page, 'wingspan', 'Rules tab');
    const lower = text.toLowerCase();
    const hasKeyword = lower.includes('bird') || lower.includes('eggs') || lower.includes('food');
    expect(hasKeyword).toBe(true);
  });

  // ── PD games load without error ────────────────────────────────

  for (const gameId of PD_GAMES) {
    test(`6-PD. ${gameId}: loads without error`, async ({ page }) => {
      let pageError: Error | null = null;
      page.on('pageerror', (err) => { pageError = err; });

      await page.goto(`${BASE_URL}/game/${gameId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Page loaded — h1 should show the game title
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible({ timeout: 10000 });
      expect(pageError).toBeNull();
    });
  }

  // ── PD games have all 4 tabs ───────────────────────────────────

  for (const gameId of PD_GAMES) {
    test(`7-tabs. ${gameId}: has all 4 learning tabs`, async ({ page }) => {
      await page.goto(`${BASE_URL}/game/${gameId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const tabLabels = ['Setup tab', 'Rules tab', 'Strategy tab', 'Q&A and Notes tab'];
      for (const label of tabLabels) {
        const tabBtn = page.locator(`button[role="tab"][aria-label="${label}"]`);
        await expect(tabBtn).toBeVisible({ timeout: 5000 });
      }
    });
  }

  // ── No tab shows "Loading..." indefinitely ─────────────────────

  for (const gameId of PD_GAMES) {
    test(`8-loading. ${gameId}: no tab stuck on Loading...`, async ({ page }) => {
      await page.goto(`${BASE_URL}/game/${gameId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const contentTabs = ['Setup tab', 'Rules tab', 'Strategy tab'];
      for (const label of contentTabs) {
        const tabBtn = page.locator(`button[role="tab"][aria-label="${label}"]`);
        await tabBtn.click();
        await page.waitForTimeout(3000);

        // Check that "Loading..." is not still showing after 5 seconds
        const loadingText = page.locator('text=Loading...');
        const loadingVisible = await loadingText.isVisible().catch(() => false);
        if (loadingVisible) {
          // Wait up to 5 more seconds for it to disappear
          await expect(loadingText).not.toBeVisible({ timeout: 5000 });
        }
      }
    });
  }

  // ── No tab shows empty content ─────────────────────────────────

  for (const gameId of PD_GAMES) {
    test(`9-empty. ${gameId}: no tab has empty content (>100 chars)`, async ({ page }) => {
      await page.goto(`${BASE_URL}/game/${gameId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const contentTabs = ['Setup tab', 'Rules tab', 'Strategy tab'];
      for (const label of contentTabs) {
        const tabBtn = page.locator(`button[role="tab"][aria-label="${label}"]`);
        await tabBtn.click();
        await page.waitForTimeout(2000);

        // Expand all accordion sections (re-query each time since DOM changes)
        for (let attempt = 0; attempt < 20; attempt++) {
          const collapsed = page.locator('button[aria-expanded="false"]');
          const remaining = await collapsed.count();
          if (remaining === 0) break;
          await collapsed.first().click({ force: true });
          await page.waitForTimeout(200);
        }

        // Check total text content is substantial
        const bodyText = await page.textContent('body') ?? '';
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });
  }
});
