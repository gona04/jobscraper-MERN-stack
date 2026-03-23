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

  const normalizedItems = normalizeLlmParsedOutput(parsed);

  return normalizedItems
    .filter((item) => item.visa_sponsorship !== 'No')
    .map((item) => {
      if (job?.link) {
        return { ...item, job_link: job.link };
      }

      return item;
    });
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
