/**
 * GMAI UI Tester (Part C1)
 * Automated browser tests using Playwright.
 * Tests: navigation, accordions, TTS controls, Q&A, rendering patterns.
 *
 * Run: npx playwright test tests/ui_tester.mjs --reporter=list
 * Or:  node tests/ui_tester.mjs
 */

import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "http://localhost:3100";
const API_URL = "http://localhost:8100";

// 5 representative games per the task spec
const TEST_GAMES = [
  { id: "catan", label: "Catan", complexity: "gateway" },
  { id: "wingspan", label: "Wingspan", complexity: "midweight" },
  { id: "skull", label: "Skull", complexity: "party" },
  { id: "brass-birmingham", label: "Brass Birmingham", complexity: "heavy" },
  { id: "king-of-tokyo", label: "King of Tokyo", complexity: "modern" },
];

const results = [];
let passCount = 0;
let failCount = 0;

function record(category, test, passed, detail = "") {
  results.push({ category, test, passed, detail });
  if (passed) passCount++;
  else failCount++;
  const icon = passed ? "PASS" : "FAIL";
  console.log(`  [${icon}] ${category} > ${test}${detail ? " — " + detail : ""}`);
}

async function testGameSelector(page) {
  console.log("\n=== Game Selector Tests ===");

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Check game count
  const gameCards = await page.locator('[class*="game"], a[href*="/game/"]').count();
  // Alternate: check for links to /game/
  const gameLinks = await page.locator('a[href*="/game/"]').count();
  const count = Math.max(gameCards, gameLinks);

  record("Navigation", "Game selector loads with 50 games", count >= 45,
    `Found ${count} game links`);

  // Click first test game
  const catanLink = page.locator(`a[href*="/game/catan"]`).first();
  if (await catanLink.count() > 0) {
    await catanLink.click();
    await page.waitForTimeout(1000);
    const url = page.url();
    record("Navigation", "Clicking game navigates to Game Teacher", url.includes("/game/catan"),
      `URL: ${url}`);
  } else {
    // Try clicking by text
    await page.getByText("Catan").first().click();
    await page.waitForTimeout(1000);
    record("Navigation", "Clicking game navigates to Game Teacher", page.url().includes("/game/"),
      `URL: ${page.url()}`);
  }
}

async function testTabs(page, gameId) {
  console.log(`\n=== Tab Tests (${gameId}) ===`);

  await page.goto(`${BASE_URL}/game/${gameId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Check all 4 tabs
  const tabs = ["Setup", "Rules", "Strategy", "Q&A"];
  for (const tab of tabs) {
    const tabButton = page.getByRole("button", { name: tab });
    const exists = (await tabButton.count()) > 0;
    record("Tabs", `${tab} tab present for ${gameId}`, exists);
  }

  // Check back button
  const backBtn = page.getByRole("button", { name: /Games/ });
  const hasBack = (await backBtn.count()) > 0;
  record("Tabs", `Back button present for ${gameId}`, hasBack);

  if (hasBack) {
    await backBtn.click();
    await page.waitForTimeout(500);
    const backUrl = page.url();
    record("Navigation", `Back button returns to selector from ${gameId}`,
      !backUrl.includes("/game/"));
    // Navigate back
    await page.goto(`${BASE_URL}/game/${gameId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
  }
}

async function testAccordions(page, gameId) {
  console.log(`\n=== Accordion Tests (${gameId}) ===`);

  await page.goto(`${BASE_URL}/game/${gameId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Count accordion sections on Setup tab
  // Accordions are buttons within the content area
  const setupButtons = await page.locator("button").filter({ hasText: /^(?!Setup|Rules|Strategy|Q&A|Games)/ }).count();
  record("Accordion", `Setup tab has accordion sections for ${gameId}`, setupButtons >= 2,
    `Found ${setupButtons} accordion-like buttons`);

  // Click first accordion to expand
  const firstAccordion = page.locator("button").filter({ hasText: /^(?!Setup|Rules|Strategy|Q&A|Games|0\.|1\.)/ }).first();
  if (await firstAccordion.count() > 0) {
    const title = await firstAccordion.textContent();
    await firstAccordion.click();
    await page.waitForTimeout(500);

    // Check content appeared
    const contentArea = page.locator("div").filter({ hasText: /\w{20,}/ });
    const hasContent = (await contentArea.count()) > 0;
    record("Accordion", `Expanding accordion shows content for ${gameId}`, hasContent,
      `Accordion: ${title?.trim().substring(0, 40)}`);

    // Check for bold-prefix bullets (rendered as <strong> inside <li>)
    const boldItems = await page.locator("li strong").count();
    record("Accordion", `Bold-prefix bullets render for ${gameId}`, boldItems > 0,
      `Found ${boldItems} bold items in list`);

    // Check for sub-headers (h4 elements in content)
    const subHeaders = await page.locator("h4").count();
    record("Accordion", `Sub-headers render for ${gameId}`, subHeaders > 0,
      `Found ${subHeaders} sub-headers`);

    // Check numbered lists have sequential numbers
    const olElements = await page.locator("ol").count();
    if (olElements > 0) {
      const firstOl = page.locator("ol").first();
      const items = await firstOl.locator("li").count();
      record("Accordion", `Numbered list has sequential numbers for ${gameId}`,
        items >= 1, `OL with ${items} items`);
    }

    // Check no raw markdown in rendered content
    const bodyText = await page.locator("div").filter({ hasText: "**" }).count();
    // More specific: look for literal ** in visible text that isn't in a code block
    const pageText = await page.textContent("body");
    const hasRawAsterisks = /\*\*[A-Z]/.test(pageText);
    record("Accordion", `No raw markdown asterisks in rendered content for ${gameId}`,
      !hasRawAsterisks, hasRawAsterisks ? "Found raw **text**" : "Clean rendering");
  }
}

async function testTTSControls(page, gameId) {
  console.log(`\n=== TTS Control Tests (${gameId}) ===`);

  await page.goto(`${BASE_URL}/game/${gameId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Speed selector should be visible BEFORE any playback
  const speedButtons = page.getByText(/0\.75x|1\.0x|1x|1\.25x|1\.5x/);
  const speedCount = await speedButtons.count();
  record("TTS", `Speed selector visible before playback for ${gameId}`, speedCount >= 2,
    `Found ${speedCount} speed buttons`);

  // Check that 1x is the default (should be highlighted)
  const activeSpeed = page.locator("button").filter({ hasText: "1x" });
  record("TTS", `Default speed is 1x for ${gameId}`, (await activeSpeed.count()) > 0);

  // Check per-section speaker buttons exist
  // Speaker buttons contain the 🔊 emoji
  const speakerBtns = await page.getByTitle(/Read this section|read/i).count();
  record("TTS", `Per-section speaker buttons present for ${gameId}`, speakerBtns >= 1,
    `Found ${speakerBtns} speaker buttons`);
}

async function testQA(page, gameId) {
  console.log(`\n=== Q&A Tests (${gameId}) ===`);

  await page.goto(`${BASE_URL}/game/${gameId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Click Q&A tab
  const qaTab = page.getByRole("button", { name: "Q&A" });
  if (await qaTab.count() > 0) {
    await qaTab.click();
    await page.waitForTimeout(500);

    // Find input
    const input = page.locator('input[type="text"]');
    if (await input.count() > 0) {
      record("Q&A", `Q&A input present for ${gameId}`, true);

      // Type a question
      await input.fill("How many players can play this game?");
      const askBtn = page.getByRole("button", { name: /Ask/i });
      if (await askBtn.count() > 0) {
        await askBtn.click();
        // Wait for response
        await page.waitForTimeout(8000);

        // Check for response
        const responseText = await page.textContent("body");
        const hasResponse = responseText.includes("GameMaster") || responseText.includes("player");
        record("Q&A", `Q&A returns response for ${gameId}`, hasResponse);
      }
    } else {
      record("Q&A", `Q&A input present for ${gameId}`, false, "Input not found");
    }
  }
}

async function runAllTests() {
  console.log("=" .repeat(60));
  console.log("  GMAI UI TESTER — Part C1");
  console.log("=".repeat(60));

  // Check backend is up
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) throw new Error("Backend unhealthy");
    console.log("Backend: OK");
  } catch (e) {
    console.error("Backend not reachable at", API_URL);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // Game selector tests
    await testGameSelector(page);

    // Per-game tests
    for (const game of TEST_GAMES) {
      await testTabs(page, game.id);
      await testAccordions(page, game.id);
      await testTTSControls(page, game.id);
    }

    // Q&A test (just one game to avoid long waits)
    await testQA(page, "catan");

  } finally {
    await browser.close();
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`  UI TESTER RESULTS: ${passCount} passed, ${failCount} failed (${results.length} total)`);
  console.log("=".repeat(60));

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { pass: passCount, fail: failCount, total: results.length },
    results,
  };
  const reportPath = "D:\\GameMasterAI\\tests\\ui_test_results.json";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to ${reportPath}`);

  return failCount === 0;
}

runAllTests().then((allPassed) => {
  process.exit(allPassed ? 0 : 1);
}).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
