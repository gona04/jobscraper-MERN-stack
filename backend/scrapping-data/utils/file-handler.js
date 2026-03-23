const fs = require("fs");
const path = require("path");

async function saveJobs(portal, jobs) {
  try {
    const dir = path.join(__dirname, "..", "data", portal);
    const file = path.join(dir, `${portal}_job_details.json`);

    // create folder if not exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // overwrite each time (clean output)
    fs.writeFileSync(file, JSON.stringify(jobs, null, 2));

    console.log(`✅ Saved ${jobs.length} ${portal} jobs → ${file}`);

  } catch (err) {
    console.error("❌ File save error:", err.message);
  }
}

module.exports = { saveJobs };