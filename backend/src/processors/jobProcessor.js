const { generateJobDetails } = require('../services/llmService');
const { extractJobText } = require('../utils/extractor');

const MAX_ATTEMPTS = 2;

function normalizeLlmParsedOutput(parsed) {
  if (Array.isArray(parsed)) {
    return parsed.flat(Infinity).filter((item) => item && typeof item === 'object' && !Array.isArray(item));
  }

  if (parsed && typeof parsed === 'object') {
    return [parsed];
  }

  return [];
}

function normalizeOnlyEnglish(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'false') {
      return normalized;
    }

    if (normalized === 'null' || normalized === '') {
      return null;
    }
  }

  return null;
}

function normalizeExtractedJob(item, sourceJob) {
  const normalizedSkills = Array.isArray(item?.skillsRequired)
    ? item.skillsRequired.filter((skill) => typeof skill === 'string' && skill.trim()).map((skill) => skill.trim())
    : [];

  return {
    jobTitle: typeof item?.jobTitle === 'string' ? item.jobTitle.trim() : '',
    job_link:
      (typeof sourceJob?.link === 'string' && sourceJob.link.trim()) ||
      (typeof item?.job_link === 'string' ? item.job_link.trim() : ''),
    visa_sponsorship: ['Yes', 'No', 'Unknown'].includes(item?.visa_sponsorship) ? item.visa_sponsorship : 'Unknown',
    only_english: normalizeOnlyEnglish(item?.only_english),
    company_name: typeof item?.company_name === 'string' ? item.company_name.trim() : '',
    rolesAndResponsibilities:
      typeof item?.rolesAndResponsibilities === 'string' ? item.rolesAndResponsibilities.trim() : '',
    skillsRequired: normalizedSkills
  };
}

async function processSingleJob(job) {
  const jobText = extractJobText(job);
  if (!jobText) {
    return [];
  }

  let llmOutput = '';
  let parsed;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      llmOutput = await generateJobDetails(jobText);
      parsed = JSON.parse(llmOutput);
      break;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        return [];
      }
    }
  }

  const normalizedItems = normalizeLlmParsedOutput(parsed).map((item) => normalizeExtractedJob(item, job));

  return normalizedItems.filter((item) => item.visa_sponsorship !== 'No');
}

async function processJobs(jobs) {
  const results = [];

  for (const job of Array.isArray(jobs) ? jobs : []) {
    try {
      const processedEntries = await processSingleJob(job);
      results.push(...processedEntries);
    } catch (error) {
      // Skip this job on LLM/runtime/parsing failures.
      continue;
    }
  }

  return results;
}

module.exports = {
  processJobs,
  normalizeLlmParsedOutput
};
