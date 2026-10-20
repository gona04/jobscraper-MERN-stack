import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generateJobDetails } = require('../../../services/llmService'); // ← adjust path if different

function mapParsedJob(job, overrideCompanyName) {
  return {
    company_name: overrideCompanyName || job.company_name || '',
    jobTitle: job.jobTitle || '',
    job_link: job.job_link || '',
    country_name: job.country_name || '',
    location: '',
    isEURegion: job.isEURegion || 'no',
    visa_sponsorship: job.visa_sponsorship || 'Unknown',
    only_english: job.only_english ?? null,
    skillsRequired: job.skillsRequired || [],
    rolesAndResponsibilities: job.rolesAndResponsibilities || '',
    jobDescription: job.rolesAndResponsibilities || ''
  };
}

/**
 * Extracts structured job entries from a batch of raw entries using GPT.
 * Each raw entry may be a string, or an object with `content` and an
 * optional `company_name` override.
 */
async function extractJobsFromEntries(rawEntries) {
  const allJobs = [];

  for (const [i, item] of rawEntries.entries()) {
    try {
      const content = typeof item === 'string' ? item : item?.content;
      const overrideCompanyName = item?.company_name || null;

      if (!content) {
        console.log(`⚠️  Job ${i + 1} skipped — no content`);
        continue;
      }

      console.log(`🔍 Extracting job ${i + 1}/${rawEntries.length}...`);

      const gptRaw = await generateJobDetails(content);
      console.log(`🤖 GPT raw response:`, gptRaw);

      const clean = gptRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const mapped = parsed.map((job) => mapParsedJob(job, overrideCompanyName));
        allJobs.push(...mapped);
        console.log(`✅ Job ${i + 1} extracted: ${mapped[0]?.company_name} — ${mapped[0]?.jobTitle}`);
      } else {
        console.log(`⚠️  Job ${i + 1} skipped — GPT returned empty`);
      }
    } catch (err) {
      console.error(`❌ GPT extraction failed for job ${i + 1}:`, err.message);
    }
  }

  return allJobs;
}

export { extractJobsFromEntries };