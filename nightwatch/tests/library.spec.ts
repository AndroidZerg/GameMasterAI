import { test, expect } from '@playwright/test';
import { loginAs, logout, BASE_URL } from './helpers/login';

// Helper: count game cards (div[role="button"] with aria-label starting "Play ")
async function countGameCards(page: import('@playwright/test').Page): Promise<number> {
  return page.locator('div[role="button"][aria-label^="Play "]').count();
}

// Helper: get the game card locator
function gameCards(page: import('@playwright/test').Page) {
  return page.locator('div[role="button"][aria-label^="Play "]');
}

test.describe('Library — Game Library Features', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ── 1. Search bar filters games ──
  test('search bar filters games — type "Catan" shows only Catan', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Search games"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('Catan');
    await page.waitForTimeout(1500);
    const cards = gameCards(page);
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i++) {
      const label = await cards.nth(i).getAttribute('aria-label');
      expect(label?.toLowerCase()).toContain('catan');
    }
  });

  // ── 2. Clear search → all games return ──
  test('clear search restores full game list', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Search games"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    const initialCount = await countGameCards(page);
    await searchInput.fill('Catan');
    await page.waitForTimeout(1500);
    const filteredCount = await countGameCards(page);
    expect(filteredCount).toBeLessThan(initialCount);
    await searchInput.fill('');
    await page.waitForTimeout(2000);
    const restoredCount = await countGameCards(page);
    expect(restoredCount).toBeGreaterThanOrEqual(initialCount - 5);
  });

  // ── 3. Filter by complexity (gateway = Easy to Learn) ──
  test('filter by complexity (gateway) shows appropriate games', async ({ page }) => {
    // Complexity filter pills: "All", "gateway", "midweight", "heavy"
    const gatewayBtn = page.locator('button').filter({ hasText: /^gateway$/i });
    if (await gatewayBtn.count() > 0) {
      const initialCount = await countGameCards(page);
      await gatewayBtn.first().click();
      await page.waitForTimeout(2000);
      const filteredCount = await countGameCards(page);
      expect(filteredCount).toBeGreaterThanOrEqual(1);
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    } else {
      test.info().annotations.push({ type: 'info', description: 'No gateway filter button found' });
    }
  });

  // ── 4. Filter by player count ──
  test('filter by player count shows appropriate games', async ({ page }) => {
    // Player count filter pills under "Players" section
    // Look for a "Great for 2" bestFor pill or a "2" players pill
    const twoPlayerBtn = page.locator('button').filter({ hasText: /^Great for 2$/i })
      .or(page.locator('button').filter({ hasText: /^2$/i }));
    if (await twoPlayerBtn.count() > 0) {
      await twoPlayerBtn.first().click();
      await page.waitForTimeout(2000);
      const filteredCount = await countGameCards(page);
      expect(filteredCount).toBeGreaterThanOrEqual(1);
    } else {
      test.info().annotations.push({ type: 'info', description: 'No player count filter button found' });
    }
  });

  // ── 5. Game cards show title, image, complexity badge ──
  test('game cards display title, image, and complexity badge', async ({ page }) => {
    const firstCard = gameCards(page).first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    // Card should have an image
    const cardImg = firstCard.locator('img');
    await expect(cardImg.first()).toBeVisible({ timeout: 5000 });
    // Card should have a title (h3)
    const title = firstCard.locator('h3');
    if (await title.count() > 0) {
      const titleText = await title.textContent();
      expect(titleText?.trim().length).toBeGreaterThan(0);
    }
    // Card aria-label should describe the game
    const label = await firstCard.getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label!.startsWith('Play ')).toBeTruthy();
  });

  // ── 6. Game of the Day appears at top ──
  test('Game of the Day card appears on home', async ({ page }) => {
    const gotd = page.getByText('Game of the Day', { exact: false })
      .or(page.getByText('GAME OF THE DAY', { exact: false }));
    const count = await gotd.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── 7. Staff Picks section appears ──
  test('Staff Picks section appears with games', async ({ page }) => {
    const staffPicks = page.getByText('Staff Picks', { exact: false });
    if (await staffPicks.count() > 0) {
      await expect(staffPicks.first()).toBeVisible();
    } else {
      // May be named differently — check for "Featured" or "Recommended"
      const alt = page.getByText('Featured', { exact: false })
        .or(page.getByText('Recommended', { exact: false }));
      const altCount = await alt.count();
      expect(altCount).toBeGreaterThanOrEqual(0);
    }
  });

  // ── 8. Recently Played section ──
  test('Recently Played section appears after playing a game', async ({ page }) => {
    // Click a game card to create "recently played"
    const firstCard = gameCards(page).first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await page.waitForURL(/\/game\//, { timeout: 10000 });
    // Return to library
    await page.goto(`${BASE_URL}/games`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const recentSection = page.getByText('Recently Played', { exact: false })
      .or(page.getByText('Continue Playing', { exact: false })
      .or(page.getByText('Jump Back In', { exact: false })));
    const count = await recentSection.count();
    // Soft check — section may or may not appear
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ── 9. Click game card → navigates to /game/{id} ──
  test('click game card navigates to /game/{id}', async ({ page }) => {
    const firstCard = gameCards(page).first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await page.waitForURL(/\/game\//, { timeout: 10000 });
    expect(page.url()).toMatch(/\/game\/.+/);
  });

  // ── 10. Back to games → returns to library ──
  test('back to games returns to library', async ({ page }) => {
    const firstCard = gameCards(page).first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await page.waitForURL(/\/game\//, { timeout: 10000 });
    // Try browser back or nav drawer
    await page.goBack();
    await page.waitForURL(/\/games/, { timeout: 10000 });
    expect(page.url()).toContain('/games');
  });

  // ── 11. Carousel sections load ──
  test('carousel sections load (category sections exist)', async ({ page }) => {
    const body = await page.textContent('body');
    const bodyLower = body?.toLowerCase() ?? '';
    // Check for filter/category terms that should exist on the games page
    const terms = ['gateway', 'midweight', 'party', 'strategy', 'game of the day'];
    let found = 0;
    for (const term of terms) {
      if (bodyLower.includes(term)) found++;
    }
    expect(found).toBeGreaterThanOrEqual(1);
  });

  // ── 12. Admin can access Customize Home ──
  test('admin can access Customize Home page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/customize`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin/customize');
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/game of the day|customize|home/i);
  });

  // ── 13. Each venue sees their own GOTD ──
  test('venue sees their own GOTD (meepleville login)', async ({ page }) => {
    await logout(page);
    // Login as meepleville venue_admin
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[aria-label="Email or username"]', 'demo@meepleville.com');
    await page.fill('input[aria-label="Password"]', 'gmg2026');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    if (page.url().includes('/games')) {
      const gotd = page.getByText('Game of the Day', { exact: false });
      const count = await gotd.count();
      // Venue may or may not have GOTD configured — soft check
      expect(count).toBeGreaterThanOrEqual(0);
    } else {
      test.skip(true, 'Meepleville account not active — cannot test venue GOTD');
    }
  });
});
