const { chromium } = require("playwright");

// ─── JOB LIST ─────────────────────────────────────────
async function scrapeLinkedInJobs(url) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    await closePopups(page);

    // scroll
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(2000);
    }

    await page.waitForSelector(".base-card", { timeout: 15000 });

    const jobs = await page.$$eval(".base-card", (cards) =>
      cards.map((card) => ({
        title: card.querySelector("h3")?.innerText.trim(),
        link: card.querySelector("a")?.href
      }))
    );

    if (!jobs.length) {
      throw new Error("No jobs found (blocked or page changed)");
    }

    return jobs;

  } finally {
    await browser.close();
  }
}

// ─── JOB DETAILS ─────────────────────────────────────
async function scrapeLinkedInJobDetails(url) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    let title = "";
    let description = "";

    try {
      title = await page.locator("h1").innerText();
    } catch {}

    const selectors = [
      ".show-more-less-html__markup",
      ".description__text"
    ];

    for (const sel of selectors) {
      try {
        description = await page.locator(sel).innerText();
        if (description) break;
      } catch {}
    }

    return { title, description };

  } finally {
    await browser.close();
  }
}

async function closePopups(page) {
  console.log("🔍 Checking for popups...");

  try {
    // Accept cookies
    const cookieBtn = await page.$("button:has-text('Accept')");
    if (cookieBtn) {
      await cookieBtn.click();
      console.log("✅ Accepted cookies");
      await page.waitForTimeout(2000);
    }
  } catch {}

  try {
    // Close login modal (X button)
    const closeBtn = await page.$("button[aria-label='Dismiss']");
    if (closeBtn) {
      await closeBtn.click();
      console.log("✅ Closed login popup");
      await page.waitForTimeout(2000);
    }
  } catch {}

  try {
    // Remove blocking overlay manually
    await page.evaluate(() => {
      const modal = document.querySelector(".artdeco-modal");
      if (modal) modal.remove();
    });
  } catch {}
}

module.exports = {
  scrapeLinkedInJobs,
  scrapeLinkedInJobDetails,
  closePopups
};