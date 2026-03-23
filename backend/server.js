const express = require("express");
const app = express();
const port = 3001;

const { scrapeJobs } = require("./scrapping-data/scrapping-job-pannel");

// ─────────────────────────────────────────────
// GLOBAL ERROR HANDLING
// ─────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error(" UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error(" UNHANDLED REJECTION:", err);
});

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(express.json());

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send(" Server is running");
});

// ─────────────────────────────────────────────
// MAIN SCRAPER ENDPOINT
// ─────────────────────────────────────────────
app.get("/api/scrape", async (req, res) => {
  const { portal, url } = req.query;

  // Validate inputs
  if (!portal) {
    return res.status(400).json({
      error: "Portal is required (linkedin | meetfrank)"
    });
  }

  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }

  try {
    console.log(`🚀 API called → portal: ${portal}`);

    const jobs = await scrapeJobs(portal, url);

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {
    console.error("API ERROR:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
app.listen(port, () => {
  console.log(` Server running at http://localhost:${port}`);
});