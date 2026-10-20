const { COVER_LETTER_SYSTEM_PROMPT, getCoverLetterPrompt } = require('../../../../prompt/coverLetterPrompt');
const { RESUME_SYSTEM_PROMPT, getResumePrompt } = require('../../../../prompt/resumePrompt');
const {
  MOTIVATION_LETTER_SYSTEM_PROMPT,
  getMotivationLetterPrompt
} = require('../../../../prompt/motivationLetterPrompt');
const { TESTING_SYSTEM_PROMPT, getTestingPrompt } = require('../../../../prompt/testingPrompt');

const { DELAY_BETWEEN_REQUESTS } = require('../config/constants');
const { normalizeCompanyName } = require('../utils/company');
const { safeParseJSON } = require('../utils/json');
const { log, delay } = require('../utils/log');
const { saveCache } = require('../cache/companyCache');
const { fetchCompanyDetails } = require('../research/companyResearch');
const { callAI } = require('../providers/callAI');
const { RESUME } = require('../resume/resume');

async function processJob(job, cache, providerConfig) {
  const rawCompany = job.company_name;
  const companyKey = normalizeCompanyName(rawCompany);

  // Company research (cached)
  let companyEntry;
  if (cache[companyKey]) {
    companyEntry = cache[companyKey];
    log(`Cache hit → ${companyKey}`);
  } else {
    companyEntry = await fetchCompanyDetails(rawCompany);
    cache[companyKey] = companyEntry;
    await saveCache(cache);
    await delay(DELAY_BETWEEN_REQUESTS);
  }

  const { status: companyStatus, website: companyWebsite, details: companyDetails } = companyEntry;

  // AI passes
  const coverLetterRaw = await callAI(
    providerConfig,
    COVER_LETTER_SYSTEM_PROMPT,
    getCoverLetterPrompt(job, RESUME)
  );
  const coverLetterParsed = safeParseJSON(coverLetterRaw);

  const resumeRaw = await callAI(
    providerConfig,
    RESUME_SYSTEM_PROMPT,
    getResumePrompt(RESUME, job, coverLetterParsed.analysis ?? '')
  );
  const resumeParsed = safeParseJSON(resumeRaw);

  const motivationContext =
    companyStatus === 'success' && companyDetails
      ? companyDetails
      : job.jobDescription ?? JSON.stringify(job);

  const motivationRaw = await callAI(
    providerConfig,
    MOTIVATION_LETTER_SYSTEM_PROMPT,
    getMotivationLetterPrompt(rawCompany, job.jobTitle, job.location, motivationContext, RESUME)
  );
  const motivationLetterParsed = safeParseJSON(motivationRaw);

  const testingRaw = await callAI(
    providerConfig,
    TESTING_SYSTEM_PROMPT,
    getTestingPrompt(
      JSON.stringify(resumeParsed?.resume ?? {}),
      JSON.stringify(coverLetterParsed?.cover_letter ?? {}),
      JSON.stringify(motivationLetterParsed ?? {}),
      job.jobDescription ?? JSON.stringify(job),
      RESUME
    )
  );
  const testingParsed = safeParseJSON(testingRaw);

  return {
    summary: testingParsed?.company_summary ?? '',
    company_name: rawCompany,
    job_title: job.jobTitle,
    motivation_letter: motivationLetterParsed,
    cover_letter: testingParsed?.cover_letter ?? coverLetterParsed?.cover_letter ?? {},
    resume: testingParsed?.resume ?? resumeParsed?.resume ?? {},
    job_link: job.jobLink ?? coverLetterParsed?.job_link ?? '',
    company_website: companyWebsite,
    company_status: companyStatus
  };
}

module.exports = { processJob };
