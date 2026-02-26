import { Page } from '@playwright/test';

const BASE_URL = 'https://playgmai.com';

/**
 * Login helper — fills the login form and waits for redirect.
 */
export async function loginAs(page: Page, username: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[aria-label="Email or username"]', username);
  await page.fill('input[aria-label="Password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(games|venue|admin|expired)/, { timeout: 15000 });
}

/**
 * Login and return the auth token from localStorage.
 */
export async function loginAndGetToken(page: Page, username: string, password: string): Promise<string> {
  await loginAs(page, username, password);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  return token ?? '';
}

/**
 * Logout by clearing localStorage and navigating to login.
 */
export async function logout(page: Page) {
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
}

export { BASE_URL };
