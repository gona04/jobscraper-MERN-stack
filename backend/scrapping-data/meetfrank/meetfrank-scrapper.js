const { chromium } = require("playwright");

function titleCaseFromSlug(slug = "") {
  return slug
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function inferCompanyFromMeetFrankLink(link = "") {
  try {
    const parsed = new URL(link);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] !== "jobs" || !parts[1]) {
      return null;
    }

    return titleCaseFromSlug(parts[1]);
  } catch {
    return null;
  }
}

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

      const findNearby = (startEl, selector, levels = 4) => {
        let node = startEl;
        for (let i = 0; i <= levels && node; i += 1) {
          const found = node.querySelector?.(selector);
          if (found) return found;
          node = node.parentElement;
        }
        return null;
      };

      for (const anchor of anchors) {
        const href = anchor.href || "";
        if (!href || seen.has(href)) continue;
        if (href.includes("/for-companies") || href.includes("/about-us")) continue;

        const titleFromCard =
          findNearby(anchor, "h2")?.innerText?.trim() ||
          findNearby(anchor, "[data-testid='job-title']")?.innerText?.trim() ||
          null;

        const title =
          titleFromCard ||
          anchor.querySelector("h2")?.innerText?.trim() ||
          anchor.querySelector("h1")?.innerText?.trim() ||
          anchor.getAttribute("aria-label")?.trim() ||
          anchor.innerText?.split("\n").map((line) => line.trim()).find((line) => line.length > 8 && line.length < 120) ||
          "";

        if (!title) continue;

        const companyName =
          findNearby(anchor, "p.gN a span")?.innerText?.trim() ||
          findNearby(anchor, "p.gN span")?.innerText?.trim() ||
          anchor.querySelector("h3")?.innerText?.trim() ||
          anchor.querySelector("[data-testid='company-name']")?.innerText?.trim() ||
          null;

        jobs.push({
          title,
          companyName,
          link: href,
          portal: "meetfrank"
        });
        seen.add(href);
      }

      return jobs;
    });

    const jobs = rawJobs.map((job) => ({
      ...job,
      companyName: job.companyName || inferCompanyFromMeetFrankLink(job.link)
    }));

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
    let companyName = "";
    let description = "";

    try {
      title = await page.locator("h1").innerText();
    } catch {}

    const companySelectors = [
      "h2",
      "[data-testid='company-name']",
      ".company-name"
    ];

    for (const sel of companySelectors) {
      try {
        companyName = (await page.locator(sel).first().innerText()).trim();
        if (companyName) break;
      } catch {}
    }

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
      companyName: companyName || inferCompanyFromMeetFrankLink(url),
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
