const fs = require("fs");
const path = require("path");
const { getDateFolderName, mergeJobs } = require("../merge-job-data");

function sanitizeFileName(value) {
  return value
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "job";
}

function getPortalDataDir(portal) {
  return path.join(__dirname, "..", "data", getDateFolderName(), portal);
}

async function saveJobs(portal, jobs) {
  try {
    const dir = getPortalDataDir(portal);
    const file = path.join(dir, `${portal}_job_details.json`);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(jobs, null, 2));

    mergeJobs(getDateFolderName());

    console.log(`✅ Saved ${jobs.length} ${portal} jobs → ${file}`);
  } catch (err) {
    console.error("❌ File save error:", err.message);
  }
}

async function saveJobDetails(portal, title, details) {
  try {
    const dir = getPortalDataDir(portal);
    const file = path.join(dir, `${sanitizeFileName(title)}.json`);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(details, null, 2));

    mergeJobs(getDateFolderName());

    console.log(`✅ Saved ${portal} job details → ${file}`);
  } catch (err) {
    console.error("❌ Job detail save error:", err.message);
  }
}

module.exports = { saveJobs, saveJobDetails };
