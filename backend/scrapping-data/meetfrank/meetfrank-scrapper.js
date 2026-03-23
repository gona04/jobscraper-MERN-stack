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

    // Wait for at least some job-linked anchors to appear
    await page.waitForSelector("a[href*='/jobs/']", { timeout: 30000 });

    await page.waitForTimeout(5000);

    // Scroll to load more jobs
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(2000);
    }

    // Extract jobs with robust selectors (MeetFrank markup changes often)
    const rawJobs = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a[href*='/jobs/']"));
      const seen = new Set();
      const jobs = [];

      for (const anchor of anchors) {
        const href = anchor.href || "";
        if (!href || seen.has(href)) continue;
        if (href.includes("/for-companies") || href.includes("/about-us")) continue;

        const title =
          anchor.querySelector("h2")?.innerText?.trim() ||
          anchor.querySelector("h1")?.innerText?.trim() ||
          anchor.getAttribute("aria-label")?.trim() ||
          anchor.innerText?.split("\n").map((line) => line.trim()).find((line) => line.length > 8 && line.length < 120) ||
          "";

        if (!title) continue;

        jobs.push({
          title,
          link: href,
          portal: "meetfrank"
        });
        seen.add(href);
      }

      return jobs;
    });

    console.log(`✅ Found ${rawJobs.length} MeetFrank jobs`);

    return rawJobs;

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
