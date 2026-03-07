#!/usr/bin/env node
/**
 * Scrape ChowNow menu for Thai House — extract categories, items, prices,
 * protein options, and spice levels.
 *
 * Usage: node tools/scrape-chownow.js
 * Output: content/menus/chownow-reference.json
 *
 * Requires: npm install puppeteer
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const CHOWNOW_URL = "https://www.chownow.com/order/33753/locations/50664";
const OUTPUT_PATH = path.join(__dirname, "..", "content", "menus", "chownow-reference.json");

async function scrapeMenu() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  console.log(`Navigating to ${CHOWNOW_URL}`);
  await page.goto(CHOWNOW_URL, { waitUntil: "networkidle2", timeout: 30000 });

  // Wait for menu sections to render
  await page.waitForSelector('[class*="menu"]', { timeout: 15000 }).catch(() => {
    console.log("Warning: menu selector not found, trying alternate selectors...");
  });

  // Give JS time to hydrate
  await new Promise((r) => setTimeout(r, 3000));

  // Extract all categories and items from the page
  const menu = await page.evaluate(() => {
    const sections = [];

    // ChowNow typically renders categories as sections with headers
    const categoryHeaders = document.querySelectorAll(
      'h2, h3, [class*="category"], [class*="section-title"], [class*="MenuCategory"]'
    );

    if (categoryHeaders.length === 0) {
      // Fallback: grab all visible text for manual review
      return { raw_text: document.body.innerText.substring(0, 10000), sections: [] };
    }

    categoryHeaders.forEach((header) => {
      const categoryName = header.textContent.trim();
      const items = [];

      // Walk siblings until next category header
      let el = header.nextElementSibling;
      while (el && !el.matches("h2, h3, [class*='category']")) {
        // Look for item cards within this section
        const itemCards = el.querySelectorAll
          ? el.querySelectorAll('[class*="item"], [class*="MenuItem"]')
          : [];

        itemCards.forEach((card) => {
          const name = card.querySelector('[class*="name"], [class*="title"]')?.textContent?.trim();
          const price = card.querySelector('[class*="price"]')?.textContent?.trim();
          const desc = card.querySelector('[class*="desc"]')?.textContent?.trim();
          if (name) {
            items.push({ name, price: price || "", description: desc || "" });
          }
        });

        el = el.nextElementSibling;
      }

      if (categoryName && items.length > 0) {
        sections.push({ category: categoryName, items });
      }
    });

    return { sections };
  });

  // Try to click individual items to get modifier details
  const itemLinks = await page.$$('[class*="item"], [class*="MenuItem"]');
  const modifiers = [];

  for (let i = 0; i < Math.min(itemLinks.length, 5); i++) {
    try {
      await itemLinks[i].click();
      await new Promise((r) => setTimeout(r, 1500));

      const modData = await page.evaluate(() => {
        const modal = document.querySelector('[class*="modal"], [class*="Modal"], [role="dialog"]');
        if (!modal) return null;

        const title = modal.querySelector('[class*="name"], [class*="title"], h2, h3')?.textContent?.trim();
        const options = [];

        modal.querySelectorAll('[class*="modifier"], [class*="option"], [class*="choice"]').forEach((opt) => {
          options.push(opt.textContent.trim());
        });

        return { title, options };
      });

      if (modData) modifiers.push(modData);

      // Close modal
      const closeBtn = await page.$('[class*="close"], [aria-label="Close"]');
      if (closeBtn) await closeBtn.click();
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      // Skip items that can't be clicked
    }
  }

  menu.modifiers_sample = modifiers;
  menu.scraped_at = new Date().toISOString();
  menu.source_url = CHOWNOW_URL;

  await browser.close();

  // Write output
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(menu, null, 2));
  console.log(`Saved to ${OUTPUT_PATH}`);
  console.log(`Found ${menu.sections?.length || 0} categories`);
}

scrapeMenu().catch((err) => {
  console.error("Scrape failed:", err.message);
  process.exit(1);
});
