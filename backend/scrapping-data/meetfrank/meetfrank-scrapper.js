const { chromium } = require("playwright");

// ─────────────────────────────────────────────
// SCRAPE JOB LIST
// ─────────────────────────────────────────────
async function scrapeMeetFrankJobs(url) {
  const browser = await chromium.launch({
    headless: false
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
  });

  const page = await context.newPage();

  try {
    console.log("🚀 Scraping MeetFrank...");

    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Wait for job cards
    await page.waitForSelector("a.fr", { timeout: 30000 });

    await page.waitForTimeout(5000);

    // Scroll to load more jobs
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(2000);
    }

    // Extract jobs
    const jobs = await page.$$eval("a.fr", (cards) =>
      cards.map((card) => {
        const title = card.querySelector("h2")?.innerText || "";
        const link = card.href;

        return {
          title: title.trim(),
          link,
          portal: "meetfrank"
        };
      })
    );

    console.log(`✅ Found ${jobs.length} MeetFrank jobs`);

    return jobs;

  } catch (err) {
    console.error("❌ MeetFrank list error:", err.message);
    return [];
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────
// SCRAPE JOB DETAILS
// ─────────────────────────────────────────────
async function scrapeMeetFrankJobDetails(url) {
  const browser = await chromium.launch({
    headless: false
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("🔍 Scraping MeetFrank job details...");

    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.waitForSelector("body", { timeout: 25000 });
    await page.waitForTimeout(5000);

    let title = "";
    let description = "";

    try {
      title = await page.locator("h1").innerText();
    } catch {}

    // Try structured description
    try {
      description = await page.locator(".job-description").innerText();
    } catch {}

    // Fallback: entire page text
    if (!description) {
      try {
        description = await page.locator("body").innerText();
      } catch {}
    }

    return {
      title,
      description
    };

  } catch (err) {
    console.error("❌ MeetFrank detail error:", err.message);
    return { error: err.message };
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeMeetFrankJobs,
  scrapeMeetFrankJobDetails
};