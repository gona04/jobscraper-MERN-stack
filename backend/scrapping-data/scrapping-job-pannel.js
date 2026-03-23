const {
  scrapeLinkedInJobs,
  scrapeLinkedInJobDetails
} = require("./linkedin/linkedin-scraper");

const {
  scrapeMeetFrankJobs,
  scrapeMeetFrankJobDetails
} = require("./meetfrank/meetfrank-scrapper");

const { saveJobs } = require("./utils/file-handler");

// ─────────────────────────────────────────────
// VISA + RELOCATION DETECTION
// ─────────────────────────────────────────────
function detectVisaSupport(text) {
  if (!text) {
    return {
      visaSponsorship: false,
      relocationSupport: false
    };
  }

  const lower = text.toLowerCase();

  const visaKeywords = [
    "visa sponsorship",
    "sponsor visa",
    "work visa",
    "visa support",
    "immigration support"
  ];

  const relocationKeywords = [
    "relocation",
    "relocation support",
    "relocation package",
    "moving assistance"
  ];

  return {
    visaSponsorship: visaKeywords.some(k => lower.includes(k)),
    relocationSupport: relocationKeywords.some(k => lower.includes(k))
  };
}

// ─────────────────────────────────────────────
// MAIN SCRAPER FUNCTION
// ─────────────────────────────────────────────
async function scrapeJobs(portal, url) {
  console.log(`🚀 Starting scrape for ${portal}...`);

  let jobList = [];

  // ─── SELECT SCRAPER ─────────────────────────
  if (portal === "linkedin") {
    jobList = await scrapeLinkedInJobs(url);
  } else if (portal === "meetfrank") {
    jobList = await scrapeMeetFrankJobs(url);
  } else {
    throw new Error("Unsupported portal");
  }

  console.log(`🔍 Found ${jobList.length} jobs`);

  const results = [];

  // ⚠️ LIMIT to avoid blocking
  const limitedJobs = jobList.slice(0, 5);

  // ─── FETCH DETAILS ─────────────────────────
  for (const job of limitedJobs) {
    try {
      console.log("➡️ Fetching details for:", job.title);

      let details;

      if (portal === "linkedin") {
        details = await scrapeLinkedInJobDetails(job.link);
      } else {
        details = await scrapeMeetFrankJobDetails(job.link);
      }

      const visaInfo = detectVisaSupport(details.description);

      results.push({
        title: job.title,
        companyName: details.companyName || job.companyName || null,
        details: {
          title: details.title || job.title,
          companyName: details.companyName || job.companyName || null,
          description: details.description || null,
          visaSponsorship: visaInfo.visaSponsorship,
          relocationSupport: visaInfo.relocationSupport
        },
        link: job.link,
        portal
      });

    } catch (err) {
      console.log("❌ Failed for job:", err.message);

      results.push({
        title: job.title,
        companyName: job.companyName || null,
        details: null,
        link: job.link,
        portal
      });
    }
  }

  // ─── SAVE TO FILE (ONLY FOR LINKEDIN FOR NOW) ───
  try {
    
      await saveJobs(portal,results);
    
  } catch (err) {
    console.log("⚠️ File save failed:", err.message);
  }

  return results;
}

module.exports = {
  scrapeJobs
};
