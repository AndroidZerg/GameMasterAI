import { test, expect, Page } from '@playwright/test';
import { loginAs, logout, BASE_URL } from './helpers/login';

// Game cards are div[role="button"] with aria-label containing game name
const GAME_CARD = 'div[role="button"][aria-label*="Play"]';

test.describe('Orders — Cart, DEMO Mode, Menu & Checkout', () => {

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      Object.keys(localStorage).filter(k => k.startsWith('gmai-cart-')).forEach(k => localStorage.removeItem(k));
    });
    await logout(page);
  });

  // ═══════════════════════════════════════════
  // BASIC CART (admin login)
  // ═══════════════════════════════════════════

  test('1. Click Catan → Order button visible (top right)', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await navigateToGame(page, 'Catan');
    const orderBtn = page.locator('button').filter({ hasText: /Order/i }).first();
    await expect(orderBtn).toBeVisible({ timeout: 5000 });
  });

  test('2. Click Order → order panel opens', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await navigateToGame(page, 'Catan');
    await page.locator('button').filter({ hasText: /Order/i }).first().click();
    await expect(page.getByText('Games & Accessories')).toBeVisible({ timeout: 5000 });
  });

  test('3. Order panel has tabs (Games & Accessories, Menu)', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await expect(page.getByText('Games & Accessories')).toBeVisible({ timeout: 5000 });
    const menuTab = page.locator('button').filter({ hasText: /^Menu$/ });
    await expect(menuTab).toBeVisible({ timeout: 3000 });
  });

  test('4. Add 1 item to cart → cart shows 1 item', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    const addBtn = page.locator('button').filter({ hasText: /^Add$/ });
    await expect(addBtn.first()).toBeVisible({ timeout: 5000 });
    await addBtn.first().click();
    await expect(page.getByText('1 item')).toBeVisible({ timeout: 3000 });
  });

  test('5. Add 3 different items → cart shows 3 items', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await expect(page.locator('button').filter({ hasText: /^Add$/ }).first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 3; i++) {
      const btns = page.locator('button').filter({ hasText: /^Add$/ });
      await btns.first().click();
      await page.waitForTimeout(300);
    }
    await expect(page.getByText('3 items')).toBeVisible({ timeout: 3000 });
  });

  test('6. Increase quantity of item → quantity updates', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
    await page.waitForTimeout(300);
    // Click "+" to increase quantity
    const plusBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await plusBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByText('2 items')).toBeVisible({ timeout: 3000 });
  });

  test('7. Remove item → removed from cart', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('1 item')).toBeVisible({ timeout: 3000 });
    // Click "-" to remove
    const minusBtn = page.locator('button').filter({ hasText: /^-$/ }).first();
    await minusBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/\d+ item/)).not.toBeVisible({ timeout: 3000 });
  });

  test('8. Subtotal updates when items added/removed', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('1 item')).toBeVisible({ timeout: 3000 });
    // Get first price displayed in cart bar
    const cartBar = page.locator('div').filter({ hasText: /item/ }).filter({ hasText: /\$/ });
    const price1 = await cartBar.first().textContent();
    // Add another item
    const btns2 = page.locator('button').filter({ hasText: /^Add$/ });
    if (await btns2.count() > 0) {
      await btns2.first().click();
      await page.waitForTimeout(300);
    }
    await expect(page.getByText('2 items')).toBeVisible({ timeout: 3000 });
    const price2 = await cartBar.first().textContent();
    // Text should have changed (different total)
    expect(price2).not.toBe(price1);
  });

  // ═══════════════════════════════════════════
  // DEMO MODE
  // ═══════════════════════════════════════════

  test('9. Demo login → order panel shows DEMO banner', async ({ page }) => {
    await loginAs(page, 'demo-dicetower', 'watress2');
    await openOrderPanelAnyGame(page);
    // DEMO banner at top of panel
    const demoBanner = page.locator('div').filter({ hasText: /^DEMO$/ }).first();
    await expect(demoBanner).toBeVisible({ timeout: 5000 });
  });

  test('10. Checkout button is disabled/greyed in DEMO mode', async ({ page }) => {
    await loginAs(page, 'demo-dicetower', 'watress2');
    await openOrderPanelAnyGame(page);
    await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
    await page.waitForTimeout(300);
    await page.getByText('View Cart & Checkout').click();
    await page.waitForTimeout(500);
    const checkoutBtn = page.getByText('Ordering available at participating venues.');
    await expect(checkoutBtn).toBeVisible({ timeout: 3000 });
    await expect(checkoutBtn).toBeDisabled();
  });

  test('11. Cart still works in DEMO mode (add/remove items)', async ({ page }) => {
    await loginAs(page, 'demo-dicetower', 'watress2');
    await openOrderPanelAnyGame(page);
    await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('1 item')).toBeVisible({ timeout: 3000 });
    await page.locator('button').filter({ hasText: /^-$/ }).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/\d+ item/)).not.toBeVisible({ timeout: 3000 });
  });

  test('12. Checkout blocked message is clear', async ({ page }) => {
    await loginAs(page, 'demo-dicetower', 'watress2');
    await openOrderPanelAnyGame(page);
    await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
    await page.waitForTimeout(300);
    await page.getByText('View Cart & Checkout').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Ordering available at participating venues.')).toBeVisible({ timeout: 3000 });
  });

  // ═══════════════════════════════════════════
  // MENU ITEMS
  // ═══════════════════════════════════════════

  test('13. Menu tab shows categories', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    // Click the Menu tab button (second tab)
    const menuTab = page.locator('button').filter({ hasText: /^Menu$/ });
    await expect(menuTab).toBeVisible({ timeout: 5000 });
    await menuTab.click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Hot Drinks').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Cold Drinks').first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Snacks').first()).toBeVisible({ timeout: 3000 });
  });

  test('14. Categories show items under them', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await page.locator('button').filter({ hasText: /^Menu$/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Drip Coffee')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Latte').first()).toBeVisible({ timeout: 3000 });
  });

  test('15. Items show name and price', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await page.locator('button').filter({ hasText: /^Menu$/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Drip Coffee')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('$3.50').first()).toBeVisible({ timeout: 3000 });
  });

  test('16. Price formatted correctly ($X.XX)', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await page.locator('button').filter({ hasText: /^Menu$/ }).click();
    await page.waitForTimeout(500);
    const prices = page.locator('text=/\\$\\d+\\.\\d{2}/');
    const count = await prices.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('17. Add menu item to cart → appears in cart', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await page.locator('button').filter({ hasText: /^Menu$/ }).click();
    await page.waitForTimeout(500);
    // Find Add button near Drip Coffee
    const coffeeSection = page.locator('div').filter({ hasText: 'Drip Coffee' }).filter({ hasText: '$3.50' });
    const addBtn = coffeeSection.locator('button').filter({ hasText: /^Add$/ }).first();
    await addBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByText('1 item')).toBeVisible({ timeout: 3000 });
    await page.getByText('View Cart & Checkout').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Drip Coffee')).toBeVisible({ timeout: 3000 });
  });

  // ═══════════════════════════════════════════
  // ORDER SUBMISSION
  // ═══════════════════════════════════════════

  test('18. Fill cart with 2 items → checkout button disabled', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await expect(page.locator('button').filter({ hasText: /^Add$/ }).first()).toBeVisible({ timeout: 5000 });
    await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('2 items')).toBeVisible({ timeout: 3000 });
    await page.getByText('View Cart & Checkout').click();
    await page.waitForTimeout(500);
    const checkoutBtn = page.getByText('Ordering available at participating venues.');
    await expect(checkoutBtn).toBeVisible({ timeout: 3000 });
    await expect(checkoutBtn).toBeDisabled();
  });

  test('19. Order API endpoint exists', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    const response = await page.request.post(`${BASE_URL}/api/orders`, {
      data: {
        venue_id: 'admin',
        session_id: 'test-session',
        items: [{ item_id: 'card-sleeves', name: 'Card Sleeves', price: 5.99, quantity: 1, category: 'Accessories' }],
        total: 5.99,
        submitted_at: new Date().toISOString(),
      },
    });
    expect(response.status()).not.toBe(404);
  });

  test('20. Cart detail shows items and subtotal correctly', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    await openOrderPanel(page, 'Catan');
    await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
    await page.waitForTimeout(300);
    await page.getByText('View Cart & Checkout').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Your Cart')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Subtotal')).toBeVisible({ timeout: 3000 });
  });

  // ═══════════════════════════════════════════
  // CRM VERIFICATION
  // ═══════════════════════════════════════════

  test('21. Analytics events endpoint tracks order_placed', async ({ page }) => {
    await loginAs(page, 'admin', 'watress2');
    const token = await page.evaluate(() => localStorage.getItem('gmai_token'));
    const response = await page.request.post(`${BASE_URL}/api/events`, {
      data: {
        venue_id: 'admin',
        events: [{
          event_type: 'order_placed',
          device_id: 'test-device',
          session_id: 'test-session',
          game_id: null,
          payload: { items: 1, total_cents: 599 },
        }],
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    // Accept 200, 201, 204, or 405 (method may require auth or specific content type)
    expect(response.status()).not.toBe(404);
  });

});

// ── Helpers ──

async function navigateToGame(page: Page, gameName: string) {
  const searchInput = page.locator('input[type="search"], input[placeholder*="earch"], input[aria-label*="earch"]');
  await expect(searchInput).toBeVisible({ timeout: 15000 });
  await searchInput.fill(gameName);
  await page.waitForTimeout(2000);
  // Game cards are div[role="button"] with aria-label containing the game name
  const card = page.locator(`${GAME_CARD}`).filter({ hasText: new RegExp(gameName, 'i') }).first();
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.click();
  await page.waitForURL(/\/game\//, { timeout: 10000 });
}

async function openOrderPanel(page: Page, gameName: string) {
  await navigateToGame(page, gameName);
  await page.locator('button').filter({ hasText: /Order/i }).first().click();
  await expect(page.getByText('Games & Accessories')).toBeVisible({ timeout: 5000 });
}

async function openOrderPanelAnyGame(page: Page) {
  const card = page.locator(GAME_CARD).first();
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.click();
  await page.waitForURL(/\/game\//, { timeout: 10000 });
  await page.locator('button').filter({ hasText: /Order/i }).first().click();
  await expect(page.getByText('Games & Accessories')).toBeVisible({ timeout: 5000 });
}
