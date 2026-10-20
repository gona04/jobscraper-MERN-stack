require("dotenv").config();

const fs = require("node:fs").promises;

const {
  INPUT_FILE,
  resultsOutputFile,
} = require("./features/settingup-cover-motivation-resume/ai-call-settingup-cover-motivation-resume/config/paths");
const {
  log,
} = require("./features/settingup-cover-motivation-resume/ai-call-settingup-cover-motivation-resume/utils/log");
const {
  loadCache,
} = require("./features/settingup-cover-motivation-resume/ai-call-settingup-cover-motivation-resume/cache/companyCache");
const {
  processJob,
} = require("./features/settingup-cover-motivation-resume/ai-call-settingup-cover-motivation-resume/pipeline/processJob");
const {
  resolveProviderConfig,
} = require("./features/settingup-cover-motivation-resume/ai-call-settingup-cover-motivation-resume/providers/resolveConfig");

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const outputFile = resultsOutputFile();

  const [rawJobs, cache] = await Promise.all([
    fs.readFile(INPUT_FILE, "utf8").then(JSON.parse),
    loadCache(),
  ]);

  const providerConfig = resolveProviderConfig();
  log(
    `Using provider: ${providerConfig.provider}, model: ${providerConfig.model}`,
  );

  const results = [];
  console.log(rawJobs.length);
  for (let i = 0; i < rawJobs.length; i++) {
    const job = rawJobs[i];
    log(
      `[${i + 1}/${rawJobs.length}] Processing → ${job.company_name ?? "unknown"}`,
    );
    if (rawJobs[i].visa_sponsorship === "Yes") {
      try {
        const processed = await processJob(job, cache, providerConfig);
        results.push(processed);
      } catch (err) {
        log(
          `Error processing ${job.company_name ?? "unknown"}: ${err.message}`,
        );
        results.push({
          summary: "",
          company_name: job.company_name ?? "",
          job_title: job.jobTitle ?? "",
          cover_letter: {},
          resume: {},
          job_link: job.jobLink ?? "",
          company_website: null,
          company_status: "error",
          error: err.message,
        });
      }
    }
  }
  await fs.writeFile(
    outputFile,
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );
  log(`Saved ${results.length} results → ${outputFile}`);
}

main().catch((err) => {
  log(`Fatal pipeline error: ${err.message}`);
  process.exitCode = 1;
});
